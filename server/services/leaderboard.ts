/**
 * Leaderboard Service
 * Handles leaderboard retrieval and player search for leaderboard
 */

import db from "../db/connection.ts";

export interface LeaderboardEntry {
  id: number;
  nickname: string;
  value: number;
  type: string;
  created_at: number;
  player_name?: string;
  player_id?: number;
}

export interface PlayerSearchResult {
  id: number;
  name: string;
}

export type LeaderboardType = "all" | "round" | "total" | "streak";

export interface LeaderboardResult {
  round?: LeaderboardEntry[];
  total?: LeaderboardEntry[];
  streak?: LeaderboardEntry[];
  players?: PlayerSearchResult[];
  playerName?: string | null;
}

/**
 * Get leaderboard entries
 */
export function getLeaderboard(
  type: LeaderboardType = "all",
  limit: number = 10,
  playerId?: number,
): LeaderboardResult {
  if (type === "all") {
    return {
      round: getEntriesByType("round", limit),
      total: getEntriesByType("total", limit),
      streak: getEntriesByType("streak", limit),
    };
  }

  if (type === "round" && playerId) {
    const entries = db
      .prepare(
        `SELECT le.id, le.nickname, le.value, le.type, le.created_at, le.player_id, p.name as player_name
         FROM leaderboard_entries le
         LEFT JOIN players p ON p.id = le.player_id
         WHERE le.type = 'round' AND le.player_id = ? AND le.nickname IS NOT NULL
         ORDER BY le.value DESC
         LIMIT ?`,
      )
      .all(playerId, limit) as LeaderboardEntry[];

    const player = db
      .prepare(`SELECT name FROM players WHERE id = ?`)
      .get(playerId) as { name: string } | undefined;

    return { round: entries, playerName: player?.name ?? null };
  }

  return { [type]: getEntriesByType(type, limit) };
}

/**
 * Search players by name for leaderboard filtering
 */
export function searchPlayersForLeaderboard(
  query: string,
): PlayerSearchResult[] {
  const escapedSearch = query.replace(/[%_\\]/g, "\\$&");
  return db
    .prepare(
      `SELECT id, name FROM players
       WHERE name LIKE ? ESCAPE '\\'
       ORDER BY name
       LIMIT 10`,
    )
    .all(`%${escapedSearch}%`) as PlayerSearchResult[];
}

// --- Internal helpers ---

function getEntriesByType(type: string, limit: number): LeaderboardEntry[] {
  if (type === "round") {
    return db
      .prepare(
        `SELECT le.id, le.nickname, le.value, le.type, le.created_at, le.player_id, p.name as player_name
         FROM leaderboard_entries le
         LEFT JOIN players p ON p.id = le.player_id
         WHERE le.type = ? AND le.nickname IS NOT NULL
         ORDER BY le.value DESC
         LIMIT ?`,
      )
      .all(type, limit) as LeaderboardEntry[];
  }

  return db
    .prepare(
      `SELECT id, nickname, value, type, created_at
       FROM leaderboard_entries
       WHERE type = ? AND nickname IS NOT NULL
       ORDER BY value DESC
       LIMIT ?`,
    )
    .all(type, limit) as LeaderboardEntry[];
}
