import { createError, defineEventHandler, readBody, sendError } from "h3";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import {
  verifyAndValidateRound,
  getRound,
  validateRoundOwnership,
  isRoundExpired,
  getRoundWithPlayer,
  hasBeenScored,
  processGuess,
} from "../services/index.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      roundId?: string;
      token?: string;
      guess?: string;
    }>(event);

    const parsed = parseSchema(
      object({
        roundId: pipe(string(), minLength(1), maxLength(128)),
        token: pipe(string(), minLength(1), maxLength(2048)),
        guess: pipe(string(), minLength(1), maxLength(128)),
      }),
      body,
    );

    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid payload" }),
      );
    }

    // Verify token and validate round
    const { sessionId } = verifyAndValidateRound(
      parsed.data.token,
      parsed.data.roundId,
    );

    // Enforce rate limit
    const rateError = enforceRateLimit(event, {
      key: "guess",
      windowMs: 10_000,
      max: 10,
      sessionId,
    });
    if (rateError) return sendError(event, rateError);

    // Get round data
    const round = getRound(parsed.data.roundId);
    if (!round) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Round not found" }),
      );
    }

    // Check if already scored
    if (hasBeenScored(round.id)) {
      return sendError(
        event,
        createError({ statusCode: 409, statusMessage: "Round already scored" }),
      );
    }

    // Validate round ownership
    if (!validateRoundOwnership(round, sessionId)) {
      return sendError(
        event,
        createError({ statusCode: 401, statusMessage: "Unauthorized round" }),
      );
    }

    // Check if round expired
    if (isRoundExpired(round)) {
      return sendError(
        event,
        createError({ statusCode: 410, statusMessage: "Round expired" }),
      );
    }

    // Get player data
    const roundData = getRoundWithPlayer(round.id);
    if (!roundData?.player) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Player not found" }),
      );
    }

    const { player } = roundData;

    // Calculate elapsed time if round was started
    const elapsedSeconds = round.started_at
      ? Math.max(0, Math.floor(Date.now() / 1000) - round.started_at)
      : undefined;

    // Process the guess and update database
    const result = processGuess(
      sessionId,
      round.id,
      player.id,
      player.name,
      parsed.data.guess,
      round.clues_used,
      elapsedSeconds,
    );

    return {
      correct: result.correct,
      score: result.score,
      breakdown: result.breakdown,
      streak: result.streak,
      bestStreak: result.bestStreak,
      sessionId,
      playerName: result.playerName,
      difficulty: result.difficulty,
    };
  } catch (error) {
    logError("guess error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to submit guess" }),
    );
  }
});
