import { defineEventHandler, readBody, createError, sendError } from "h3";
import db from "../db/connection.ts";
import { verifyRoundToken } from "../utils/tokens.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      roundId?: string;
      token?: string;
    }>(event);

    const parsed = parseSchema(
      object({
        roundId: pipe(string(), minLength(1), maxLength(128)),
        token: pipe(string(), minLength(1), maxLength(2048)),
      }),
      body,
    );

    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid payload" }),
      );
    }

    const payload = verifyRoundToken(parsed.data.token);
    if (payload.roundId !== parsed.data.roundId) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Round mismatch" }),
      );
    }

    const rateError = enforceRateLimit(event, {
      key: "clue",
      windowMs: 10_000,
      max: 5,
      sessionId: payload.sessionId,
    });
    if (rateError) return sendError(event, rateError);

    const round = db
      .prepare(
        `SELECT id, session_id, player_id, clues_used, max_clues_allowed, expires_at FROM rounds WHERE id = ?`,
      )
      .get(parsed.data.roundId) as
      | {
          id: string;
          session_id: string;
          player_id: number;
          clues_used: number;
          max_clues_allowed: number;
          expires_at: number | null;
        }
      | undefined;

    if (!round) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Round not found" }),
      );
    }

    if (round.session_id !== payload.sessionId) {
      return sendError(
        event,
        createError({ statusCode: 401, statusMessage: "Unauthorized round" }),
      );
    }

    if (round.expires_at && round.expires_at * 1000 < Date.now()) {
      return sendError(
        event,
        createError({ statusCode: 410, statusMessage: "Round expired" }),
      );
    }

    if (round.clues_used >= round.max_clues_allowed) {
      return sendError(
        event,
        createError({ statusCode: 429, statusMessage: "Clue limit reached" }),
      );
    }

    db.prepare(
      `UPDATE rounds SET clues_used = clues_used + 1 WHERE id = ?`,
    ).run(parsed.data.roundId);

    const updated = db
      .prepare(`SELECT clues_used, max_clues_allowed FROM rounds WHERE id = ?`)
      .get(parsed.data.roundId) as { clues_used: number; max_clues_allowed: number };

    return { cluesUsed: updated?.clues_used ?? round.clues_used + 1, cluesRemaining: (updated?.max_clues_allowed ?? round.max_clues_allowed) - (updated?.clues_used ?? round.clues_used + 1) };
  } catch (error) {
    logError("useClue error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to record clue" }),
    );
  }
});
