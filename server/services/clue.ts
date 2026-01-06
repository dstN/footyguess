/**
 * Clue Service
 * Handles clue usage tracking and limits
 */

import db from "../db/connection.ts";

export interface ClueStatus {
  cluesUsed: number;
  cluesRemaining: number;
}

/**
 * Check if clue limit has been reached
 */
export function hasReachedClueLimit(
  cluesUsed: number,
  maxAllowed: number,
): boolean {
  return cluesUsed >= maxAllowed;
}

/**
 * Record clue usage and return updated status
 * @throws Error if round does not exist
 */
export function useClue(roundId: string): ClueStatus {
  // First check if round exists
  const round = db
    .prepare(`SELECT id FROM rounds WHERE id = ?`)
    .get(roundId) as { id: string } | undefined;

  if (!round) {
    throw new Error(`Round ${roundId} not found`);
  }

  db.prepare(`UPDATE rounds SET clues_used = clues_used + 1 WHERE id = ?`).run(
    roundId,
  );

  const updated = db
    .prepare(`SELECT clues_used, max_clues_allowed FROM rounds WHERE id = ?`)
    .get(roundId) as {
    clues_used: number;
    max_clues_allowed: number;
  };

  return {
    cluesUsed: updated.clues_used,
    cluesRemaining: updated.max_clues_allowed - updated.clues_used,
  };
}
