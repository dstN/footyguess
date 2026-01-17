import db from "../db/connection";

export interface ResetResult {
  scores: number;
  rounds: number;
  leaderboard: number;
  sessions: number;
}

/**
 * Reset all game data (sessions, scores, leaderboard, rounds)
 * Preserves player data (players, transfers, player_stats, clubs, etc.)
 *
 * @returns Object with counts of deleted rows per table
 */
export function resetScores(): ResetResult {
  const reset = db.transaction(() => {
    const deleteScores = db.prepare("DELETE FROM scores");
    const deleteRounds = db.prepare("DELETE FROM rounds");
    const deleteLeaderboard = db.prepare("DELETE FROM leaderboard_entries");
    const deleteSessions = db.prepare("DELETE FROM sessions");

    const infoScores = deleteScores.run();
    const infoRounds = deleteRounds.run();
    const infoLeaderboard = deleteLeaderboard.run();
    const infoSessions = deleteSessions.run();

    return {
      scores: infoScores.changes,
      rounds: infoRounds.changes,
      leaderboard: infoLeaderboard.changes,
      sessions: infoSessions.changes,
    };
  });

  return reset();
}
