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
  const query = getQuery(event);
  const type = (query.type as string) || "all";
  const limit = Math.min(Number(query.limit) || 10, 50);
  const playerId = query.playerId ? Number(query.playerId) : undefined;
  const searchPlayer = (query.searchPlayer as string) || undefined;

  // If searching for players by name
  if (searchPlayer) {
    const players = db
      .prepare(
        `SELECT id, name FROM players 
         WHERE name LIKE ? 
         ORDER BY name 
         LIMIT 10`,
      )
      .all(`%${searchPlayer}%`) as PlayerSearchResult[];

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
});
