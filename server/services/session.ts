/**
 * Session Service
 * Handles session statistics retrieval
 */

import db from "../db/connection.ts";
import { getStreakBonusMultiplier } from "../utils/scoring.ts";

export interface LastScore {
  score: number;
  baseScore: number; // adjustedBase (base × multiplier)
  cluesUsed: number;
  missedGuesses: number;
  streak: number;
  streakBonus: number;
  streakBonusPoints: number;
  noClueBonus: number;
  cluePenalty: number;
  noMaliceBonus: number;
  malicePenalty: number;
  timeBonus: number;
  timeBonusPoints: number;
  roundScore: number;
  playerName: string | null;
  playerTmUrl: string | null;
}

export interface SessionStats {
  sessionId: string;
  exists: boolean;
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
        nickname: string;
        total_score: number;
      }
    | undefined;

  // Calculate live total from scores table if session exists
  let cachedTotal = 0;
  if (session) {
    const liveTotal = db
      .prepare(
        `SELECT COALESCE(SUM(score), 0) as total FROM scores WHERE session_id = ?`,
      )
      .get(sessionId) as { total: number };

    cachedTotal = session.total_score ?? 0;
    const calculatedTotal = liveTotal?.total ?? 0;

    // If there's a discrepancy, update the cache
    if (calculatedTotal !== cachedTotal && calculatedTotal > cachedTotal) {
      try {
        db.prepare(`UPDATE sessions SET total_score = ? WHERE id = ?`).run(
          calculatedTotal,
          sessionId,
        );
        cachedTotal = calculatedTotal;
      } catch {
        // Ignore update failures
      }
    }
  }

  const lastScoreRow = db
    .prepare(
      `SELECT s.*, r.player_id, r.clues_used
       FROM scores s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.session_id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`,
    )
    .get(sessionId) as
    | {
        score: number;
        base_score: number;
        time_score: number;
        malice_penalty: number;
        streak: number;
        player_id: number;
        clues_used: number;
      }
    | undefined;

  const lastPlayer = lastScoreRow
    ? (db
        .prepare(`SELECT name, tm_url FROM players WHERE id = ?`)
        .get(lastScoreRow.player_id) as { name: string; tm_url: string })
    : null;

  const submittedTypes = db
    .prepare(
      `SELECT type FROM leaderboard_entries WHERE session_id = ? AND nickname IS NOT NULL`,
    )
    .all(sessionId) as { type: string }[];

  let lastScore: LastScore | null = null;
  if (lastScoreRow) {
    const streakBonus = getStreakBonusMultiplier(lastScoreRow.streak ?? 0);
    const cluesUsed = lastScoreRow.clues_used ?? 0;

    // malice_penalty in DB is stored as actual points penalty
    // We need to infer missedGuesses from it
    // capped penalty formula: min(0.3, 0.06 * missedGuesses) * adjustedBase = malicePenalty
    const adjustedBase = lastScoreRow.base_score ?? 0;
    const malicePenaltyStored = Math.abs(lastScoreRow.malice_penalty ?? 0);

    // Reverse calculate missedGuesses
    let missedGuesses = 0;
    if (adjustedBase > 0 && malicePenaltyStored > 0) {
      const penaltyRatio = malicePenaltyStored / adjustedBase;
      missedGuesses = Math.round(penaltyRatio / 0.06);
      if (missedGuesses > 5) missedGuesses = 5; // Cap is 30% (5 * 6%)
    }

    // Reconstruct scoring breakdown (ALL ADDITIVE on adjustedBase)
    const streakBonusPoints = Math.round(adjustedBase * streakBonus);

    // Clue bonus/penalty (capped at 30%)
    const noClueBonus = cluesUsed === 0 ? Math.round(adjustedBase * 0.1) : 0;
    const clueRawPenalty = cluesUsed > 0 ? Math.min(0.3, 0.06 * cluesUsed) : 0;
    const cluePenalty = Math.round(adjustedBase * clueRawPenalty);

    // Malice bonus/penalty (capped at 30%)
    const noMaliceBonus =
      missedGuesses === 0 ? Math.round(adjustedBase * 0.1) : 0;
    const malicePenalty = missedGuesses > 0 ? malicePenaltyStored : 0;

    // Time: approximate from difference
    const timeScore = lastScoreRow.time_score ?? adjustedBase;
    const estimatedTimePoints = timeScore - adjustedBase;
    const timeBonus = adjustedBase > 0 ? estimatedTimePoints / adjustedBase : 0;

    lastScore = {
      score: lastScoreRow.score,
      baseScore: adjustedBase,
      cluesUsed,
      missedGuesses,
      streak: lastScoreRow.streak,
      streakBonus,
      streakBonusPoints,
      noClueBonus,
      cluePenalty,
      noMaliceBonus,
      malicePenalty,
      timeBonus: Math.max(-0.3, timeBonus), // Cap at -30%
      timeBonusPoints: Math.round(adjustedBase * Math.max(-0.3, timeBonus)),
      roundScore: lastScoreRow.score,
      playerName: lastPlayer?.name ?? null,
      playerTmUrl: lastPlayer?.tm_url ?? null,
    };
  }

  return {
    sessionId,
    exists: !!session,
    nickname: session?.nickname ?? null,
    streak: session?.streak ?? 0,
    bestStreak: session?.best_streak ?? 0,
    totalScore: cachedTotal,
    lastPlayerId: lastScoreRow?.player_id ?? null,
    lastScore,
    submittedTypes: submittedTypes.map((e) => e.type),
  };
}
