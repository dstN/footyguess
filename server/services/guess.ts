/**
 * Guess Service
 * Handles guess processing, validation, and scoring logic
 */

import db from "../db/connection.ts";
import type { Difficulty } from "../utils/difficulty.ts";
import { computeDifficulty } from "../utils/difficulty.ts";
import type { ScoreBreakdown } from "../utils/scoring.ts";
import { calculateScore } from "../utils/scoring.ts";

export interface GuessResult {
  correct: boolean;
  score: number;
  breakdown: ScoreBreakdown;
  streak: number;
  bestStreak: number;
  playerName: string;
  difficulty: Difficulty;
}

/**
 * Normalize and compare guess against player name
 */
export function isCorrectGuess(guess: string, playerName: string): boolean {
  const normalize = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['']/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const normalizedGuess = normalize(guess);
  const normalizedName = normalize(playerName);

  return normalizedGuess === normalizedName;
}

/**
 * Calculate difficulty based on player stats
 */
export function getDifficulty(playerId: number) {
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
    db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(sessionId);
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

  // Get number of wrong guesses for this round so far
  const guessHistory = db
    .prepare(
      `SELECT COUNT(*) as count FROM scores WHERE round_id = ? AND correct = 0`,
    )
    .get(roundId) as { count: number };
  // Total wrong guesses: previous wrong + 1 if current is wrong, else just previous
  const totalWrongGuesses = guessHistory.count + (correct ? 0 : 1);

  const breakdown = calculateScore(
    difficulty,
    cluesUsed,
    sessionRow?.streak ?? 0,
    { elapsedSeconds, missedGuesses: totalWrongGuesses },
  );

  const nextStreak = correct ? (sessionRow?.streak ?? 0) + 1 : 0;
  const nextBest = Math.max(sessionRow?.best_streak ?? 0, nextStreak);

  // Award points even on wrong guess, but with malice penalty applied
  const earnedScore = breakdown.finalScore;
  const earnedBase = breakdown.preStreak;
  const earnedTime = breakdown.timeScore;

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
      `INSERT INTO scores (session_id, round_id, score, base_score, time_score, malice_penalty, correct, streak, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      sessionId,
      roundId,
      earnedScore,
      earnedBase,
      earnedTime,
      breakdown.malicePenalty ?? 0,
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
 * Check if round was already solved (correct guess recorded)
 */
export function hasBeenScored(roundId: string): boolean {
  const existing = db
    .prepare(`SELECT id FROM scores WHERE round_id = ? AND correct = 1`)
    .get(roundId) as { id: number } | undefined;
  return !!existing;
}
