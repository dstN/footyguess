import db from "../db/connection";
import { logInfo, logError } from "../utils/logger";

/**
 * Result of a session deletion operation
 */
export interface DeleteSessionResult {
  success: boolean;
  sessionId: string;
  deleted: {
    scores: number;
    rounds: number;
    leaderboard: number;
    sessions: number;
  };
}

/**
 * Check if a session exists in the database
 * @param sessionId - The session ID to check
 * @returns True if session exists, false otherwise
 */
export function sessionExists(sessionId: string): boolean {
  const result = db
    .prepare(`SELECT id FROM sessions WHERE id = ?`)
    .get(sessionId) as { id: string } | undefined;

  return !!result;
}

/**
 * Delete a session and all its associated data
 * Deletes in FK-safe order: scores -> leaderboard_entries -> rounds -> sessions
 *
 * @param sessionId - The session ID to delete
 * @returns Result object with counts of deleted rows per table
 * @throws Error if session does not exist
 */
export function deleteSession(sessionId: string): DeleteSessionResult {
  // First check if session exists
  if (!sessionExists(sessionId)) {
    logError("Session not found for deletion", "deleteSession", { sessionId });
    return {
      success: false,
      sessionId,
      deleted: {
        scores: 0,
        rounds: 0,
        leaderboard: 0,
        sessions: 0,
      },
    };
  }

  const deleteOp = db.transaction(() => {
    // Delete in FK-constraint safe order
    const deleteScores = db.prepare(`DELETE FROM scores WHERE session_id = ?`);
    const deleteLeaderboard = db.prepare(
      `DELETE FROM leaderboard_entries WHERE session_id = ?`,
    );
    const deleteRounds = db.prepare(`DELETE FROM rounds WHERE session_id = ?`);
    const deleteSessions = db.prepare(`DELETE FROM sessions WHERE id = ?`);

    const infoScores = deleteScores.run(sessionId);
    const infoLeaderboard = deleteLeaderboard.run(sessionId);
    const infoRounds = deleteRounds.run(sessionId);
    const infoSessions = deleteSessions.run(sessionId);

    return {
      scores: infoScores.changes,
      leaderboard: infoLeaderboard.changes,
      rounds: infoRounds.changes,
      sessions: infoSessions.changes,
    };
  });

  const deleted = deleteOp();

  logInfo("Session deleted successfully", "deleteSession", {
    sessionId,
    deleted,
  });

  return {
    success: true,
    sessionId,
    deleted,
  };
}
