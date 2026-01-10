/**
 * Request Service
 * Handles player request status retrieval
 */

import db from "../db/connection.ts";

export interface RequestStatus {
  id: number;
  url: string;
  status: string;
  playerId: number | null;
  error: string | null;
}

/**
 * Get player request status by ID
 */
export function getRequestStatus(id: number): RequestStatus | null {
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

  if (!row) return null;

  return {
    id: row.id,
    url: row.url,
    status: row.status,
    playerId: row.player_id,
    error: row.error,
  };
}
