import { defineEventHandler, getQuery, createError, sendError } from "h3";
import db from "../db/connection";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = Number(query.id);
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
    | { id: number; url: string; status: string; player_id: number | null; error: string | null }
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
});
