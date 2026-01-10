import { defineEventHandler, getQuery, createError, sendError } from "h3";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getSessionStats } from "../services/session.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  // Rate limit: 30 requests per 60 seconds per IP
  const rateError = enforceRateLimit(event, {
    key: "sessionStats",
    windowMs: 60_000,
    max: 30,
  });
  if (rateError) return sendError(event, rateError);

  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        sessionId: pipe(string(), minLength(1), maxLength(128)),
      }),
      query,
    );
    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid query" }),
      );
    }

    return getSessionStats(parsed.data.sessionId);
  } catch (error) {
    logError("sessionStats error", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: "Failed to load session stats",
      }),
    );
  }
});
