import { defineEventHandler, readBody } from "h3";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { AppError, Errors, handleApiError } from "../utils/errors.ts";
import { errorResponse } from "../utils/response.ts";
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
      return errorResponse(400, "Invalid request body", event, {
        received: body,
      });
    }

    // Enforce rate limit BEFORE token verification to prevent DoS attacks
    // Use IP-based rate limiting for initial protection
    const ipRateError = enforceRateLimit(event, {
      key: "guess-ip",
      windowMs: 10_000,
      max: 20,
    });
    if (ipRateError)
      throw new AppError(429, "Too many requests", "RATE_LIMITED");

    // Verify token and validate round
    const { sessionId } = verifyAndValidateRound(
      parsed.data.token,
      parsed.data.roundId,
    );

    // Enforce stricter session-based rate limit
    const sessionRateError = enforceRateLimit(event, {
      key: "guess",
      windowMs: 10_000,
      max: 10,
      sessionId,
    });
    if (sessionRateError)
      throw new AppError(429, "Too many requests", "RATE_LIMITED");

    // Get round data
    const round = getRound(parsed.data.roundId);
    if (!round) {
      throw Errors.notFound("Round", parsed.data.roundId);
    }

    // Validate round ownership
    if (!validateRoundOwnership(round, sessionId)) {
      throw Errors.unauthorized("Round does not belong to this session");
    }

    // Check if round expired
    if (isRoundExpired(round)) {
      throw new AppError(410, "Round expired", "ROUND_EXPIRED");
    }

    // Get player data
    const roundData = getRoundWithPlayer(round.id);
    if (!roundData?.player) {
      throw Errors.notFound("Player");
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
      aborted: result.aborted,
      abortReason: result.abortReason,
      wrongGuessCount: result.wrongGuessCount,
    };
  } catch (error) {
    return handleApiError(event, error, "guess");
  }
});
