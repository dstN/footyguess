import { createError, defineEventHandler, getQuery, sendError } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection.ts";
import { createRoundToken, generateSessionId } from "../utils/tokens.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { errorResponse } from "../utils/response.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getRandomPlayer, getPlayerById } from "../services/player.ts";
import { object, optional, picklist, string, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  // Rate limit: 20 requests per 60 seconds per IP (game starts are limited)
  const rateError = enforceRateLimit(event, {
    key: "randomPlayer",
    windowMs: 60_000,
    max: 20,
  });
  if (rateError) return sendError(event, rateError);

  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        mode: optional(picklist(["hard", "normal"])),
        sessionId: optional(pipe(string(), maxLength(128))),
      }),
      query,
    );
    if (!parsed.ok) {
      return errorResponse(400, "Invalid query parameters", event, {
        received: query,
      });
    }

    const hardMode = parsed.data.mode === "hard";
    const sessionFromQuery = parsed.data.sessionId ?? null;
    const sessionId = sessionFromQuery || generateSessionId();

    // 1. Check for restoration of Active Round
    if (sessionFromQuery) {
      const nowSec = Math.floor(Date.now() / 1000);
      const activeRound = db
        .prepare(
          `
        SELECT r.id, r.player_id, r.expires_at, r.clues_used
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

          return {
            ...playerDetails,
            round: {
              id: activeRound.id,
              token,
              sessionId: sessionFromQuery,
              expiresAt: expiresAtMs,
              cluesUsed: activeRound.clues_used,
            },
          };
        }
      }
    }

    // 2. Start New Round (if no active round found)
    const playerData = getRandomPlayer(hardMode);
    if (!playerData) {
      return errorResponse(
        404,
        "No matching player found for selected difficulty",
        event,
      );
    }

    // Create session and round (still needs direct DB for atomicity)
    db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(sessionId);

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

    return {
      ...playerData,
      round: {
        id: roundId,
        token,
        sessionId,
        expiresAt,
        cluesUsed: 0,
      },
    };
  } catch (error) {
    logError("randomPlayer error", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get random player",
    });
  }
});
