import { defineEventHandler, getQuery, createError, sendError } from "h3";
import { parseSchema } from "../utils/validate";
import { logError } from "../utils/logger";
import { enforceRateLimit } from "../utils/rate-limit";
import { object, optional, string, maxLength, pipe, picklist } from "valibot";
import db from "../db/connection";

interface LeaderboardEntry {
  id: number;
  nickname: string;
  value: number;
  type: string;
  created_at: number;
  player_name?: string;
  player_id?: number;
}

interface PlayerSearchResult {
  id: number;
  name: string;
}

export default defineEventHandler(async (event) => {
  // Rate limit: 30 requests per 60 seconds per IP
  const rateError = enforceRateLimit(event, {
    key: "leaderboard",
    windowMs: 60_000,
    max: 30,
  });
  if (rateError) return sendError(event, rateError);

  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        type: optional(picklist(["all", "round", "total", "streak"])),
        limit: optional(pipe(string(), maxLength(3))),
        playerId: optional(pipe(string(), maxLength(20))),
        searchPlayer: optional(pipe(string(), maxLength(64))),
      }),
      query,
    );

    if (!parsed.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid query parameters",
      });
    }

    const type = parsed.data.type || "all";
    const limit = Math.min(Number(parsed.data.limit) || 10, 50);
    const playerId = parsed.data.playerId
      ? Number(parsed.data.playerId)
      : undefined;
    const searchPlayer = parsed.data.searchPlayer;

    // If searching for players by name
    if (searchPlayer) {
      // Escape LIKE wildcards to prevent injection
      const escapedSearch = searchPlayer.replace(/[%_\\]/g, "\\$&");
      const players = db
        .prepare(
          `SELECT id, name FROM players 
         WHERE name LIKE ? ESCAPE '\\'
         ORDER BY name 
         LIMIT 10`,
        )
        .all(`%${escapedSearch}%`) as PlayerSearchResult[];

      return { players };
    }

    // If requesting round scores for a specific player
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

      // Get player name
      const player = db
        .prepare(`SELECT name FROM players WHERE id = ?`)
        .get(playerId) as { name: string } | undefined;

      return { round: entries, playerName: player?.name ?? null };
    }

    if (type === "all") {
      // Get top round entries with player names
      const roundEntries = db
        .prepare(
          `SELECT le.id, le.nickname, le.value, le.type, le.created_at, le.player_id, p.name as player_name
         FROM leaderboard_entries le
         LEFT JOIN players p ON p.id = le.player_id
         WHERE le.type = 'round' AND le.nickname IS NOT NULL
         ORDER BY le.value DESC 
         LIMIT ?`,
        )
        .all(limit) as LeaderboardEntry[];

      const totalEntries = db
        .prepare(
          `SELECT id, nickname, value, type, created_at 
         FROM leaderboard_entries 
         WHERE type = 'total' AND nickname IS NOT NULL
         ORDER BY value DESC 
         LIMIT ?`,
        )
        .all(limit) as LeaderboardEntry[];

      const streakEntries = db
        .prepare(
          `SELECT id, nickname, value, type, created_at 
         FROM leaderboard_entries 
         WHERE type = 'streak' AND nickname IS NOT NULL
         ORDER BY value DESC 
         LIMIT ?`,
        )
        .all(limit) as LeaderboardEntry[];

      return {
        round: roundEntries,
        total: totalEntries,
        streak: streakEntries,
      };
    }

    // Get entries for specific type
    const entries = db
      .prepare(
        `SELECT le.id, le.nickname, le.value, le.type, le.created_at, le.player_id, p.name as player_name
       FROM leaderboard_entries le
       LEFT JOIN players p ON p.id = le.player_id
       WHERE le.type = ? AND le.nickname IS NOT NULL
       ORDER BY le.value DESC 
       LIMIT ?`,
      )
      .all(type, limit) as LeaderboardEntry[];

    return { [type]: entries };
  } catch (error) {
    logError("leaderboard error", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch leaderboard",
    });
  }
});
