/**
 * Guess Service
 * Handles guess processing, validation, and scoring logic
 */

import db from "../db/connection.ts";
import { computeDifficulty } from "../utils/difficulty.ts";
import { calculateScore } from "../utils/scoring.ts";

export interface GuessResult {
  correct: boolean;
  score: number;
  breakdown: {
    baseScore: number;
    streakMultiplier: number;
    preStreak: number;
    timeScore: number;
    finalScore: number;
  };
  streak: number;
  bestStreak: number;
  playerName: string;
  difficulty: string;
}

/**
 * Normalize and compare guess against player name
 */
export function isCorrectGuess(guess: string, playerName: string): boolean {
  const normalizedGuess = guess.trim().toLowerCase();
  return normalizedGuess === playerName.trim().toLowerCase();
}

/**
 * Calculate difficulty based on player stats
 */
export function getDifficulty(playerId: number): string {
  const stats = db
    .prepare(
      `
      SELECT
        ps.appearances,
        c.id AS competition_id
      FROM player_stats ps
      JOIN competitions c ON ps.competition_id = c.id
      WHERE ps.player_id = ?
    `,
    )
    .all(playerId) as Array<{ appearances: number; competition_id: string }>;

  return computeDifficulty(stats);
}

/**
 * Get or create session with atomic operation
 */
export function getOrCreateSession(sessionId: string): {
  streak: number;
  best_streak: number;
} {
  const insertAndRead = db.transaction(() => {
    db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(
      sessionId,
    );
    return db
      .prepare(`SELECT streak, best_streak FROM sessions WHERE id = ?`)
      .get(sessionId) as { streak: number; best_streak: number };
  });

  return insertAndRead();
}

/**
 * Calculate guess score and update session
 */
export function processGuess(
  sessionId: string,
  roundId: string,
  playerId: number,
  playerName: string,
  guess: string,
  cluesUsed: number,
  elapsedSeconds?: number,
): GuessResult {
  const correct = isCorrectGuess(guess, playerName);
  const difficulty = getDifficulty(playerId);
  const sessionRow = getOrCreateSession(sessionId);

  const breakdown = calculateScore(
    difficulty,
    cluesUsed,
    sessionRow?.streak ?? 0,
    { elapsedSeconds },
  );

  const nextStreak = correct ? (sessionRow?.streak ?? 0) + 1 : 0;
  const nextBest = Math.max(sessionRow?.best_streak ?? 0, nextStreak);

  const earnedScore = correct ? breakdown.finalScore : 0;
  const earnedBase = correct ? breakdown.preStreak : 0;
  const earnedTime = correct ? breakdown.timeScore : 0;

  // Update session and scores atomically
  const writeScore = db.transaction(() => {
    db.prepare(
      `UPDATE sessions
       SET streak = ?,
           best_streak = ?,
           total_score = COALESCE(total_score, 0) + ?,
           total_rounds = COALESCE(total_rounds, 0) + 1,
           last_round_score = ?,
           last_round_base = ?,
           last_round_time_score = ?
       WHERE id = ?`,
    ).run(
      nextStreak,
      nextBest,
      earnedScore,
      earnedScore,
      earnedBase,
      earnedTime,
      sessionId,
    );

    db.prepare(
      `INSERT INTO scores (session_id, round_id, score, base_score, time_score, correct, streak, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(round_id) DO NOTHING`,
    ).run(
      sessionId,
      roundId,
      earnedScore,
      earnedBase,
      earnedTime,
      correct ? 1 : 0,
      nextStreak,
      Math.floor(Date.now() / 1000),
    );
  });

  writeScore();

  return {
    correct,
    score: earnedScore,
    breakdown,
    streak: nextStreak,
    bestStreak: nextBest,
    playerName,
    difficulty,
  };
}

/**
 * Check if guess was already recorded for this round
 */
export function hasBeenScored(roundId: string): boolean {
  const existing = db
    .prepare(`SELECT id FROM scores WHERE round_id = ?`)
    .get(roundId) as { id: number } | undefined;
  return !!existing;
}
