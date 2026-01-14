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
  /** True if round was aborted due to too many wrong guesses */
  aborted?: boolean;
  /** Reason for abort (e.g., 'too_many_wrong_guesses') */
  abortReason?: string;
  /** Current count of wrong guesses this round */
  wrongGuessCount?: number;
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
 * Maximum wrong guesses allowed before round abort
 */
const MAX_WRONG_GUESSES = 5;

/**
 * Grace period: 5s per transfer, capped at 30s (6 transfers)
 */
const GRACE_SECONDS_PER_TRANSFER = 5;
const MAX_GRACE_SECONDS = 30;

/**
 * Get transfer count for a player (for grace period calculation)
 */
function getTransferCount(playerId: number): number {
  const result = db
    .prepare(`SELECT COUNT(*) as count FROM transfers WHERE player_id = ?`)
    .get(playerId) as { count: number };
  return result?.count ?? 0;
}

/**
 * Calculate grace seconds based on transfer count
 */
function calculateGraceSeconds(playerId: number): number {
  const transferCount = getTransferCount(playerId);
  return Math.min(
    MAX_GRACE_SECONDS,
    transferCount * GRACE_SECONDS_PER_TRANSFER,
  );
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

  // Calculate grace seconds based on player transfers
  const graceSeconds = calculateGraceSeconds(playerId);

  // Check for round abort: 6th wrong guess = instant loss
  if (!correct && totalWrongGuesses > MAX_WRONG_GUESSES) {
    // Record the failed guess with score = 0
    const abortBreakdown = calculateScore(difficulty, cluesUsed, 0, {
      elapsedSeconds,
      missedGuesses: totalWrongGuesses,
      graceSeconds,
    });

    db.transaction(() => {
      // Reset streak, don't add any score
      db.prepare(
        `UPDATE sessions
         SET streak = 0,
             last_round_score = 0,
             last_round_base = 0,
             last_round_time_score = 0
         WHERE id = ?`,
      ).run(sessionId);

      // Record the abort
      db.prepare(
        `INSERT INTO scores (session_id, round_id, score, base_score, time_score, malice_penalty, correct, streak, created_at)
         VALUES (?, ?, 0, 0, 0, -1, 0, 0, ?)`,
      ).run(sessionId, roundId, Math.floor(Date.now() / 1000));
    })();

    return {
      correct: false,
      score: 0,
      breakdown: { ...abortBreakdown, finalScore: 0 },
      streak: 0,
      bestStreak: sessionRow?.best_streak ?? 0,
      playerName,
      difficulty,
      aborted: true,
      abortReason: "too_many_wrong_guesses",
      wrongGuessCount: totalWrongGuesses,
    };
  }

  const breakdown = calculateScore(
    difficulty,
    cluesUsed,
    sessionRow?.streak ?? 0,
    { elapsedSeconds, missedGuesses: totalWrongGuesses, graceSeconds },
  );

  const nextStreak = correct ? (sessionRow?.streak ?? 0) + 1 : 0;
  const nextBest = Math.max(sessionRow?.best_streak ?? 0, nextStreak);

  // Only award points on correct guess
  const earnedScore = correct ? breakdown.finalScore : 0;
  const earnedBase = correct ? breakdown.adjustedBase : 0;
  const earnedTime = correct
    ? breakdown.adjustedBase + breakdown.timeBonusPoints
    : 0;

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
    wrongGuessCount: totalWrongGuesses,
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
