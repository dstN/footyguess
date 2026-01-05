import { defineEventHandler, readBody, createError, sendError } from "h3";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
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
      key: "clue",
      windowMs: 10_000,
      max: 5,
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

    // Check clue limit
    if (hasReachedClueLimit(round.clues_used, round.max_clues_allowed ?? 0)) {
      return sendError(
        event,
        createError({ statusCode: 429, statusMessage: "Clue limit reached" }),
      );
    }

    // Record clue usage
    const result = useClue(parsed.data.roundId);

    return {
      cluesUsed: result.cluesUsed,
      cluesRemaining: result.cluesRemaining,
    };
  } catch (error) {
    logError("useClue error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to record clue" }),
    );
  }
});
