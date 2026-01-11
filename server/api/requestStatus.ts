import { defineEventHandler, getQuery } from "h3";
import { parseSchema } from "../utils/validate.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { getRequestStatus } from "../services/request.ts";
import { AppError, Errors, handleApiError } from "../utils/errors.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    // Rate limit: 60 requests per 60 seconds per IP (status polling)
    const rateError = enforceRateLimit(event, {
      key: "requestStatus",
      windowMs: 60_000,
      max: 60,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");

    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        id: pipe(string(), minLength(1), maxLength(32)),
      }),
      query,
    );
    if (!parsed.ok) {
      throw Errors.badRequest("Invalid query");
    }

    const id = Number(parsed.data.id);
    if (!Number.isFinite(id)) {
      throw Errors.badRequest("Missing request id");
    }

    const status = getRequestStatus(id);
    if (!status) {
      throw Errors.notFound("Request", id);
    }

    return status;
  } catch (error) {
    return handleApiError(event, error, "requestStatus");
  }
});
