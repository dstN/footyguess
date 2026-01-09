import db from "../db/connection.ts";
import { logInfo, logError } from "./logger";

/**
 * Session cleanup configuration
 */
const CLEANUP_CONFIG = {
  /** Sessions older than this (in days) will be deleted */
  sessionMaxAgeDays: 30,
  /** Rounds older than this (in days) will be deleted */
  roundMaxAgeDays: 7,
  /** Maximum rows to delete in one batch (prevents long locks) */
  batchSize: 1000,
};

/**
 * Cleanup old sessions and related data
 * Deletes sessions older than 30 days and their associated records
 *
 * @returns Cleanup statistics
 *
 * @example
 * const stats = cleanupOldSessions();
 * console.log(`Deleted ${stats.sessions} sessions`);
 */
export function cleanupOldSessions(): {
  sessions: number;
  rounds: number;
  scores: number;
  leaderboardEntries: number;
} {
  const cutoffTimestamp =
    Math.floor(Date.now() / 1000) -
    CLEANUP_CONFIG.sessionMaxAgeDays * 24 * 60 * 60;

  const stats = {
    sessions: 0,
    rounds: 0,
    scores: 0,
    leaderboardEntries: 0,
  };

  try {
    // Find old session IDs
    const oldSessions = db
      .prepare(
        `SELECT id FROM sessions 
         WHERE created_at < ? 
         LIMIT ?`,
      )
      .all(cutoffTimestamp, CLEANUP_CONFIG.batchSize) as { id: string }[];

    if (oldSessions.length === 0) {
      logInfo("No old sessions to cleanup", "session-cleanup");
      return stats;
    }

    const sessionIds = oldSessions.map((s) => s.id);
    const placeholders = sessionIds.map(() => "?").join(",");

    // Delete in order: scores -> leaderboard -> rounds -> sessions (FK order)
    const deleteScores = db.prepare(
      `DELETE FROM scores WHERE session_id IN (${placeholders})`,
    );
    const deleteLeaderboard = db.prepare(
      `DELETE FROM leaderboard_entries WHERE session_id IN (${placeholders})`,
    );
    const deleteRounds = db.prepare(
      `DELETE FROM rounds WHERE session_id IN (${placeholders})`,
    );
    const deleteSessions = db.prepare(
      `DELETE FROM sessions WHERE id IN (${placeholders})`,
    );

    // Run in transaction for consistency
    db.transaction(() => {
      stats.scores = deleteScores.run(...sessionIds).changes;
      stats.leaderboardEntries = deleteLeaderboard.run(...sessionIds).changes;
      stats.rounds = deleteRounds.run(...sessionIds).changes;
      stats.sessions = deleteSessions.run(...sessionIds).changes;
    })();

    logInfo(
      `Session cleanup complete: ${stats.sessions} sessions, ${stats.rounds} rounds, ${stats.scores} scores, ${stats.leaderboardEntries} leaderboard entries`,
      "session-cleanup",
      stats,
    );
  } catch (error) {
    logError("Session cleanup failed", error, "session-cleanup");
  }

  return stats;
}

/**
 * Cleanup expired rounds (not linked to score submissions)
 * Rounds expire after their expires_at timestamp
 *
 * @returns Number of rounds deleted
 */
export function cleanupExpiredRounds(): number {
  const now = Math.floor(Date.now() / 1000);
  const roundCutoff = now - CLEANUP_CONFIG.roundMaxAgeDays * 24 * 60 * 60;

  try {
    // Delete expired rounds that have no associated scores
    const result = db
      .prepare(
        `DELETE FROM rounds 
         WHERE expires_at < ? 
         AND id NOT IN (SELECT round_id FROM scores)
         LIMIT ?`,
      )
      .run(roundCutoff, CLEANUP_CONFIG.batchSize);

    if (result.changes > 0) {
      logInfo(`Deleted ${result.changes} expired rounds`, "session-cleanup");
    }

    return result.changes;
  } catch (error) {
    logError("Expired round cleanup failed", error, "session-cleanup");
    return 0;
  }
}

/**
 * Run full cleanup (sessions + expired rounds)
 * Call this from a scheduled task or API endpoint
 */
export function runFullCleanup(): {
  sessions: number;
  rounds: number;
  scores: number;
  leaderboardEntries: number;
  expiredRounds: number;
} {
  const sessionStats = cleanupOldSessions();
  const expiredRounds = cleanupExpiredRounds();

  return {
    ...sessionStats,
    expiredRounds,
  };
}
