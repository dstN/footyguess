import { defineEventHandler, readBody } from "h3";
import db from "../db/connection.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { AppError, Errors, handleApiError } from "../utils/errors.ts";
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
      throw Errors.badRequest("Invalid request");
    }

    // Rate limit
    const rateError = enforceRateLimit(event, {
      key: "surrender",
      windowMs: 60_000,
      max: 10,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");

    const { sessionId } = verifyAndValidateRound(
      parsed.data.token,
      parsed.data.roundId,
    );

    const round = getRound(parsed.data.roundId);
    if (!round) {
      throw Errors.notFound("Round", parsed.data.roundId);
    }

    if (!validateRoundOwnership(round, sessionId)) {
      throw Errors.unauthorized();
    }

    if (isRoundExpired(round)) {
      throw new AppError(410, "Round expired", "ROUND_EXPIRED");
    }

    const roundData = getRoundWithPlayer(round.id);
    if (!roundData?.player) {
      throw Errors.notFound("Player");
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
    return handleApiError(event, error, "surrender");
  }
});
