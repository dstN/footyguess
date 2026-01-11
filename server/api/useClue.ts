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
  hasReachedClueLimit,
  useClue,
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
      return errorResponse(400, "Invalid request body", event, {
        received: body,
      });
    }

    // Enforce rate limit BEFORE token verification to prevent DoS attacks
    // Use IP-based rate limiting for initial protection
    const ipRateError = enforceRateLimit(event, {
      key: "clue-ip",
      windowMs: 10_000,
      max: 15,
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
      key: "clue",
      windowMs: 10_000,
      max: 5,
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

    // Check clue limit
    if (hasReachedClueLimit(round.clues_used, round.max_clues_allowed ?? 0)) {
      throw new AppError(429, "Clue limit reached", "CLUE_LIMIT_REACHED");
    }

    // Record clue usage
    const result = useClue(parsed.data.roundId);

    return {
      cluesUsed: result.cluesUsed,
      cluesRemaining: result.cluesRemaining,
    };
  } catch (error) {
    return handleApiError(event, error, "useClue");
  }
});
