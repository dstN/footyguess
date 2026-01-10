import { defineEventHandler, readBody, createError, sendError } from "h3";
import db from "../db/connection.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import {
  verifyAndValidateRound,
  getRound,
  validateRoundOwnership,
  isRoundExpired,
  getRoundWithPlayer,
} from "../services/index.ts";
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
        createError({ statusCode: 400, statusMessage: "Invalid request" }),
      );
    }

    // Rate limit
    const rateError = enforceRateLimit(event, {
      key: "surrender",
      windowMs: 60_000,
      max: 10,
    });
    if (rateError) return sendError(event, rateError);

    const { sessionId } = verifyAndValidateRound(
      parsed.data.token,
      parsed.data.roundId,
    );

    const round = getRound(parsed.data.roundId);
    if (!round) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Round not found" }),
      );
    }

    if (!validateRoundOwnership(round, sessionId)) {
      return sendError(
        event,
        createError({ statusCode: 401, statusMessage: "Unauthorized" }),
      );
    }

    if (isRoundExpired(round)) {
      return sendError(
        event,
        createError({ statusCode: 410, statusMessage: "Round expired" }),
      );
    }

    const roundData = getRoundWithPlayer(round.id);
    if (!roundData?.player) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Player not found" }),
      );
    }

    // Mark as completed with 0 score
    // We explicitly set score=0, streak=0, correct=0
    db.prepare(
      `INSERT INTO scores (round_id, session_id, score, base_score, time_score, streak, malice_penalty, correct)
       VALUES (?, ?, 0, 0, 0, 0, 0, 0)`,
    ).run(round.id, sessionId);

    // Reset session streak to 0 in sessions table
    db.prepare(`UPDATE sessions SET streak = 0 WHERE id = ?`).run(sessionId);

    return {
      ok: true,
      playerName: roundData.player.name,
      playerTmUrl: roundData.player.tm_url,
    };
  } catch (error) {
    logError("surrender error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to surrender" }),
    );
  }
});
