import { defineEventHandler, getQuery } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection.ts";
import { createRoundToken, generateSessionId } from "../utils/tokens.ts";
import { parseSchema } from "../utils/validate.ts";
import { AppError, handleApiError } from "../utils/errors.ts";
import { errorResponse } from "../utils/response.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getRandomPlayer, getPlayerById } from "../services/player.ts";
import { object, optional, picklist, string, maxLength, pipe } from "valibot";
import type { DifficultyTier, UserSelectedDifficulty } from "~/types/player";

/**
 * Resolve "default" difficulty to a random tier from easy, medium, hard
 * @returns Random tier excluding ultra
 */
function resolveDefaultDifficulty(): DifficultyTier {
  const tiers: DifficultyTier[] = ["easy", "medium", "hard"];
  return tiers[Math.floor(Math.random() * tiers.length)] as DifficultyTier;
}

export default defineEventHandler(async (event) => {
  try {
    // Rate limit: 20 requests per 60 seconds per IP (game starts are limited)
    const rateError = enforceRateLimit(event, {
      key: "randomPlayer",
      windowMs: 60_000,
      max: 20,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");

    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        // Legacy mode param (backwards compatibility)
        mode: optional(picklist(["hard", "normal"])),
        // New difficulty param
        difficulty: optional(
          picklist(["default", "easy", "medium", "hard", "ultra"]),
        ),
        sessionId: optional(pipe(string(), maxLength(128))),
      }),
      query,
    );
    if (!parsed.ok) {
      return errorResponse(400, "Invalid query parameters", event, {
        received: query,
      });
    }

    // Resolve difficulty: new param takes precedence, fallback to legacy mode
    let tierFilter: DifficultyTier | undefined;
    const userDifficulty = parsed.data.difficulty as
      | UserSelectedDifficulty
      | undefined;

    if (userDifficulty) {
      tierFilter =
        userDifficulty === "default"
          ? resolveDefaultDifficulty()
          : userDifficulty;
    } else if (parsed.data.mode === "hard") {
      // Legacy: mode=hard means ultra
      tierFilter = "ultra";
    }

    const sessionFromQuery = parsed.data.sessionId ?? null;
    const sessionId = sessionFromQuery || generateSessionId();

    // 1. Check for restoration of Active Round
    if (sessionFromQuery) {
      const nowSec = Math.floor(Date.now() / 1000);
      const activeRound = db
        .prepare(
          `
        SELECT r.id, r.player_id, r.expires_at, r.clues_used, r.started_at
        FROM rounds r
        LEFT JOIN scores s ON s.round_id = r.id
        WHERE r.session_id = ? 
          AND r.expires_at > ?
          AND s.id IS NULL
        LIMIT 1
      `,
        )
        .get(sessionFromQuery, nowSec) as
        | {
            id: string;
            player_id: number;
            expires_at: number;
            clues_used: number;
            started_at: number;
          }
        | undefined;

      if (activeRound) {
        // Restore this round!
        const playerDetails = getPlayerById(activeRound.player_id);
        if (playerDetails) {
          const expiresAtMs = activeRound.expires_at * 1000;
          const token = createRoundToken({
            roundId: activeRound.id,
            playerId: activeRound.player_id,
            sessionId: sessionFromQuery,
            exp: expiresAtMs,
          });

          // Get transfer count for grace period - use filtered length from player details
          const transferCount = playerDetails.transfers.length;

          return {
            ...playerDetails,
            round: {
              id: activeRound.id,
              token,
              sessionId: sessionFromQuery,
              expiresAt: expiresAtMs,
              cluesUsed: activeRound.clues_used,
              startedAt: activeRound.started_at,
              transferCount,
            },
          };
        }
      }
    }

    // 2. Start New Round (if no active round found)
    // Get player IDs already played in this session to avoid duplicates
    const playedPlayerIds = db
      .prepare(`SELECT DISTINCT player_id FROM rounds WHERE session_id = ?`)
      .all(sessionId) as { player_id: number }[];
    const excludePlayerIds = playedPlayerIds.map((row) => row.player_id);

    const playerData = getRandomPlayer({ tierFilter, excludePlayerIds });
    if (!playerData) {
      return errorResponse(
        404,
        "No matching player found for selected difficulty",
        event,
      );
    }

    // Create session and round (still needs direct DB for atomicity)
    // Store difficulty in session for future leaderboard filtering
    const sessionDifficulty = parsed.data.difficulty || "default";
    db.prepare(
      `INSERT OR IGNORE INTO sessions (id, difficulty) VALUES (?, ?)`,
    ).run(sessionId, sessionDifficulty);

    const roundId = randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 30;
    db.prepare(
      `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at, max_clues_allowed) VALUES (?, ?, ?, 0, ?, ?, 10)`,
    ).run(
      roundId,
      playerData.id,
      sessionId,
      Math.floor(Date.now() / 1000),
      Math.floor(expiresAt / 1000),
    );

    const token = createRoundToken({
      roundId,
      playerId: playerData.id,
      sessionId,
      exp: expiresAt,
    });

    // Get transfer count for grace period - use filtered length from player data
    const transferCount = playerData.transfers.length;

    return {
      ...playerData,
      round: {
        id: roundId,
        token,
        sessionId,
        expiresAt,
        cluesUsed: 0,
        startedAt: Math.floor(Date.now() / 1000),
        transferCount,
      },
    };
  } catch (error) {
    return handleApiError(event, error, "randomPlayer");
  }
});
