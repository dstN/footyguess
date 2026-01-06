import { defineEventHandler, readBody, createError, sendError } from "h3";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
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
    if (ipRateError) return sendError(event, ipRateError);

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
    if (sessionRateError) return sendError(event, sessionRateError);

    // Get round data
    const round = getRound(parsed.data.roundId);
    if (!round) {
      return errorResponse(404, "Round not found", event);
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
      return errorResponse(410, "Round expired", event);
    }

    // Check clue limit
    if (hasReachedClueLimit(round.clues_used, round.max_clues_allowed ?? 0)) {
      return errorResponse(429, "Clue limit reached", event);
    }

    // Record clue usage
    const result = useClue(parsed.data.roundId);

    return {
      cluesUsed: result.cluesUsed,
      cluesRemaining: result.cluesRemaining,
    };
  } catch (error) {
    logError("useClue error", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to record clue",
    });
  }
});
