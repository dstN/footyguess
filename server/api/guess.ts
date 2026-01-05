import { createError, defineEventHandler, readBody, sendError } from "h3";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
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
      return errorResponse(
        400,
        "Invalid request body",
        event,
        { received: body },
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
      return errorResponse(
        404,
        "Round not found",
        event,
      );
    }

    // Check if already scored
    if (hasBeenScored(round.id)) {
      return errorResponse(
        409,
        "Round already scored",
        event,
      );
    }

    // Validate round ownership
    if (!validateRoundOwnership(round, sessionId)) {
      return errorResponse(
        401,
        "Unauthorized - round does not belong to this session",
        event,
      );
    }

    // Check if round expired
    if (isRoundExpired(round)) {
      return errorResponse(
        410,
        "Round expired",
        event,
      );
    }

    // Get player data
    const roundData = getRoundWithPlayer(round.id);
    if (!roundData?.player) {
      return errorResponse(
        404,
        "Player not found",
        event,
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

    return successResponse(
      {
        correct: result.correct,
        score: result.score,
        breakdown: result.breakdown,
        streak: result.streak,
        bestStreak: result.bestStreak,
        sessionId,
        playerName: result.playerName,
        difficulty: result.difficulty,
      },
      event,
    );
  } catch (error) {
    logError("guess error", error);
    return errorResponse(
      500,
      "Failed to submit guess",
      event,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );
  }
});
