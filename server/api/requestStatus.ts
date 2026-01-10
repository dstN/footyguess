import { defineEventHandler, getQuery, createError, sendError } from "h3";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getRequestStatus } from "../services/request.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  // Rate limit: 60 requests per 60 seconds per IP (status polling)
  const rateError = enforceRateLimit(event, {
    key: "requestStatus",
    windowMs: 60_000,
    max: 60,
  });
  if (rateError) return sendError(event, rateError);

  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        id: pipe(string(), minLength(1), maxLength(32)),
      }),
      query,
    );
    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid query" }),
      );
    }

    const id = Number(parsed.data.id);
    if (!Number.isFinite(id)) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Missing request id" }),
      );
    }

    const status = getRequestStatus(id);
    if (!status) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Request not found" }),
      );
    }

    return status;
  } catch (error) {
    logError("requestStatus error", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: "Failed to fetch request",
      }),
    );
  }
});
