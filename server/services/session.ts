/**
 * Session Service
 * Handles session statistics retrieval
 */

import db from "../db/connection.ts";
import { getStreakBonusMultiplier } from "../utils/scoring.ts";

export interface LastScore {
  score: number;
  baseScore: number;
  cluesUsed: number;
  streak: number;
  streakBonus: number;
  timeMultiplier: number;
  malicePenalty: number;
  playerName: string | null;
  playerTmUrl: string | null;
}

export interface SessionStats {
  sessionId: string;
  nickname: string | null;
  streak: number;
  bestStreak: number;
  totalScore: number;
  lastPlayerId: number | null;
  lastScore: LastScore | null;
  submittedTypes: string[];
}

/**
 * Get session statistics by session ID
 */
export function getSessionStats(sessionId: string): SessionStats {
  const session = db
    .prepare(
      `SELECT id, streak, best_streak, nickname, total_score FROM sessions WHERE id = ?`,
    )
    .get(sessionId) as
    | {
        id: string;
        streak: number;
        best_streak: number;
        nickname?: string;
        total_score?: number;
      }
    | undefined;

  const lastScoreRow = db
    .prepare(
      `SELECT s.score, s.base_score, s.time_score, s.malice_penalty, s.streak, r.player_id, r.clues_used
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.session_id = ?
       ORDER BY s.id DESC
       LIMIT 1`,
    )
    .get(sessionId) as
    | {
        score: number;
        base_score: number;
        time_score: number;
        malice_penalty?: number;
        streak: number;
        player_id: number;
        clues_used: number;
      }
    | undefined;

  const lastPlayer = lastScoreRow
    ? (db
        .prepare(`SELECT name, tm_url FROM players WHERE id = ?`)
        .get(lastScoreRow.player_id) as
        | { name: string; tm_url: string | null }
        | undefined)
    : undefined;

  const cachedTotal =
    session?.total_score === null || session?.total_score === undefined
      ? (
          db
            .prepare(
              `SELECT IFNULL(SUM(score),0) AS totalScore FROM scores WHERE session_id = ?`,
            )
            .get(sessionId) as { totalScore: number }
        ).totalScore
      : session.total_score;

  const submittedTypes = db
    .prepare(
      `SELECT type FROM leaderboard_entries WHERE session_id = ? AND nickname IS NOT NULL`,
    )
    .all(sessionId) as { type: string }[];

  let lastScore: LastScore | null = null;
  if (lastScoreRow) {
    const streakBonus = getStreakBonusMultiplier(lastScoreRow.streak ?? 0);
    const timeMultiplier =
      lastScoreRow.base_score && lastScoreRow.time_score
        ? lastScoreRow.time_score / (lastScoreRow.base_score || 1)
        : 1;

    lastScore = {
      score: lastScoreRow.score,
      baseScore: lastScoreRow.base_score,
      cluesUsed: lastScoreRow.clues_used ?? 0,
      streak: lastScoreRow.streak,
      streakBonus,
      timeMultiplier,
      malicePenalty: lastScoreRow.malice_penalty ?? 0,
      playerName: lastPlayer?.name ?? null,
      playerTmUrl: lastPlayer?.tm_url ?? null,
    };
  }

  return {
    sessionId,
    nickname: session?.nickname ?? null,
    streak: session?.streak ?? 0,
    bestStreak: session?.best_streak ?? 0,
    totalScore: cachedTotal ?? 0,
    lastPlayerId: lastScoreRow?.player_id ?? null,
    lastScore,
    submittedTypes: submittedTypes.map((e) => e.type),
  };
}
