import { defineEventHandler, getQuery } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection.ts";
import { createRoundToken, generateSessionId } from "../utils/tokens.ts";
import { parseSchema } from "../utils/validate.ts";
import { AppError, handleApiError } from "../utils/errors.ts";
import { errorResponse } from "../utils/response.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getPlayerByName } from "../services/player.ts";
import { object, string, minLength, maxLength, optional, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    // Rate limit: 30 requests per 60 seconds per IP
    const rateError = enforceRateLimit(event, {
      key: "getPlayer",
      windowMs: 60_000,
      max: 30,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        name: pipe(string(), minLength(1), maxLength(128)),
        sessionId: optional(pipe(string(), maxLength(128))),
      }),
      query,
    );
    if (!parsed.ok) {
      return errorResponse(400, "Invalid query parameters", event, {
        received: query,
      });
    }

    const name = parsed.data.name;
    const sessionFromQuery = parsed.data.sessionId ?? null;
    const sessionId = sessionFromQuery || generateSessionId();

    // Use player service
    const playerData = getPlayerByName(name);
    if (!playerData) {
      return errorResponse(404, `Player "${name}" not found`, event);
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
    return handleApiError(event, error, "getPlayer");
  }
});
