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

// ────────────────────────────────────────────────────────────────────────────
// Score Submission Types
// ────────────────────────────────────────────────────────────────────────────

export interface SessionScoreData {
  id: string;
  total_score: number;
  last_round_score: number | null;
  last_round_base: number | null;
  last_round_time_score: number | null;
}

export interface RoundScoreData {
  score: number;
  base_score: number;
  time_score: number;
  streak: number;
  player_id: number;
}

export interface ExistingEntry {
  id: number;
  value: number;
}

export interface SubmitScoreResult {
  ok: boolean;
  type: LeaderboardType;
  value: number;
  nickname: string | null;
  skipped: boolean;
  playerName?: string | null;
  message?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Score Submission Functions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get session data for score submission
 */
export function getSessionForScoring(
  sessionId: string,
): SessionScoreData | undefined {
  return db
    .prepare(
      `SELECT id, total_score, last_round_score, last_round_base, last_round_time_score 
       FROM sessions WHERE id = ?`,
    )
    .get(sessionId) as SessionScoreData | undefined;
}

/**
 * Update session nickname
 */
export function updateSessionNickname(
  sessionId: string,
  nickname: string,
): void {
  db.prepare(`UPDATE sessions SET nickname = ? WHERE id = ?`).run(
    nickname,
    sessionId,
  );
}

/**
 * Get the last round score data for a session
 */
export function getLastRoundScore(
  sessionId: string,
): RoundScoreData | undefined {
  return db
    .prepare(
      `SELECT s.score, s.base_score, s.time_score, s.streak, r.player_id
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.session_id = ?
       ORDER BY s.id DESC
       LIMIT 1`,
    )
    .get(sessionId) as RoundScoreData | undefined;
}

/**
 * Get player name by ID
 */
export function getPlayerName(playerId: number): string | null {
  const player = db
    .prepare(`SELECT name FROM players WHERE id = ?`)
    .get(playerId) as { name: string } | undefined;
  return player?.name ?? null;
}

/**
 * Get existing leaderboard entry for a session/type
 */
export function getExistingEntry(
  sessionId: string,
  type: LeaderboardType,
  playerId?: number,
): ExistingEntry | undefined {
  if (type === "round" && playerId !== undefined) {
    return db
      .prepare(
        `SELECT id, value FROM leaderboard_entries 
         WHERE session_id = ? AND type = 'round' AND player_id = ?`,
      )
      .get(sessionId, playerId) as ExistingEntry | undefined;
  }
  return db
    .prepare(
      `SELECT id, value FROM leaderboard_entries WHERE session_id = ? AND type = ?`,
    )
    .get(sessionId, type) as ExistingEntry | undefined;
}

/**
 * Get best streak for a session
 */
export function getSessionBestStreak(sessionId: string): number {
  const row = db
    .prepare(`SELECT best_streak FROM sessions WHERE id = ?`)
    .get(sessionId) as { best_streak: number } | undefined;
  return row?.best_streak ?? 0;
}

/**
 * Get total score for a session (calculated from scores table if not cached)
 */
export function getSessionTotalScore(
  sessionId: string,
  cachedTotal?: number | null,
): number {
  if (cachedTotal !== null && cachedTotal !== undefined) {
    return cachedTotal;
  }
  const row = db
    .prepare(
      `SELECT IFNULL(SUM(score),0) AS totalScore FROM scores WHERE session_id = ?`,
    )
    .get(sessionId) as { totalScore: number };
  return row.totalScore ?? 0;
}

/**
 * Upsert a leaderboard entry (update if exists and higher, insert if new)
 */
export function upsertLeaderboardEntry(params: {
  sessionId: string;
  type: LeaderboardType;
  value: number;
  baseScore: number | null;
  finalScore: number | null;
  streak: number | null;
  playerId?: number;
  existingEntryId?: number;
}): void {
  const { sessionId, type, value, baseScore, finalScore, streak, playerId, existingEntryId } = params;

  if (existingEntryId) {
    // Update existing entry
    db.prepare(
      `UPDATE leaderboard_entries 
       SET value = ?, base_score = ?, final_score = ?, streak = ?, 
           nickname = (SELECT nickname FROM sessions WHERE id = ?), 
           created_at = strftime('%s','now')
       WHERE id = ?`,
    ).run(value, baseScore, finalScore, streak, sessionId, existingEntryId);
  } else if (type === "round" && playerId !== undefined) {
    // Insert round entry with player_id
    db.prepare(
      `INSERT INTO leaderboard_entries 
       (session_id, type, value, base_score, final_score, streak, nickname, player_id, created_at)
       VALUES (?, 'round', ?, ?, ?, ?, (SELECT nickname FROM sessions WHERE id = ?), ?, strftime('%s','now'))`,
    ).run(sessionId, value, baseScore, finalScore, streak, sessionId, playerId);
  } else {
    // Insert total/streak entry
    db.prepare(
      `INSERT INTO leaderboard_entries 
       (session_id, type, value, base_score, final_score, streak, nickname, created_at)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT nickname FROM sessions WHERE id = ?), strftime('%s','now'))`,
    ).run(sessionId, type, value, baseScore, finalScore, streak, sessionId);
  }
}

/**
 * Get the final value of a leaderboard entry
 */
export function getEntryValue(
  sessionId: string,
  type: LeaderboardType,
): number | undefined {
  const entry = db
    .prepare(
      `SELECT value FROM leaderboard_entries WHERE session_id = ? AND type = ?`,
    )
    .get(sessionId, type) as { value: number } | undefined;
  return entry?.value;
}
