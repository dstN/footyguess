import { defineEventHandler, getQuery } from "h3";
import { parseSchema } from "../utils/validate.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getSessionStats } from "../services/session.ts";
import { AppError, Errors, handleApiError } from "../utils/errors.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    // Rate limit: 30 requests per 60 seconds per IP
    const rateError = enforceRateLimit(event, {
      key: "sessionStats",
      windowMs: 60_000,
      max: 30,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");

    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        sessionId: pipe(string(), minLength(1), maxLength(128)),
      }),
      query,
    );
    if (!parsed.ok) {
      throw Errors.badRequest("Invalid query");
    }

    return getSessionStats(parsed.data.sessionId);
  } catch (error) {
    return handleApiError(event, error, "sessionStats");
  }
});
