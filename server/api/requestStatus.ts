import { defineEventHandler, getQuery, createError, sendError } from "h3";
import db from "../db/connection.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
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

    const row = db
      .prepare(
        `SELECT id, url, status, player_id, error FROM requested_players WHERE id = ?`,
      )
      .get(id) as
      | {
          id: number;
          url: string;
          status: string;
          player_id: number | null;
          error: string | null;
        }
      | undefined;

    if (!row) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Request not found" }),
      );
    }

    return {
      id: row.id,
      url: row.url,
      status: row.status,
      playerId: row.player_id,
      error: row.error,
    };
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
