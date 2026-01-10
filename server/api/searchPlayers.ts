import { createError, defineEventHandler, getQuery, sendError } from "h3";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { searchPlayers } from "../services/player.ts";
import { object, optional, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler((event) => {
  // Rate limit: 60 requests per 60 seconds per IP (search is frequent)
  const rateError = enforceRateLimit(event, {
    key: "searchPlayers",
    windowMs: 60_000,
    max: 60,
  });
  if (rateError) return sendError(event, rateError);

  const query = getQuery(event);
  const parsed = parseSchema(
    object({
      q: optional(pipe(string(), minLength(2), maxLength(64))),
      limit: optional(string()),
    }),
    query,
  );
  if (!parsed.ok) {
    return [];
  }

  const q = parsed.data.q;
  const limit = parsed.data.limit;
  if (!q || q.trim().length < 2) {
    return [];
  }

  const safeLimit =
    typeof limit === "string" ? Math.min(Number(limit) || 10, 25) : 10;

  try {
    return searchPlayers(q, safeLimit);
  } catch (error) {
    logError("searchPlayers error", error);
    throw createError({ statusCode: 500, statusMessage: "Search failed" });
  }
});
