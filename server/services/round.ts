/**
 * Round Service
 * Handles round validation, verification, and state management
 */

import db from "../db/connection.ts";
import { verifyRoundToken } from "../utils/tokens.ts";

export interface RoundData {
  id: string;
  session_id: string;
  player_id: number;
  clues_used: number;
  max_clues_allowed?: number;
  expires_at: number | null;
  started_at?: number | null;
}

/**
 * Verify round token and validate round ownership
 * @throws Error if token is invalid or round mismatch
 */
export function verifyAndValidateRound(
  token: string,
  roundId: string,
): { sessionId: string; payload: any } {
  const payload = verifyRoundToken(token);
  if (payload.roundId !== roundId) {
    throw new Error("Round mismatch");
  }
  return { sessionId: payload.sessionId, payload };
}

/**
 * Retrieve round data by ID
 * @returns Round data or undefined if not found
 */
export function getRound(roundId: string): RoundData | undefined {
  return db
    .prepare(
      `SELECT id, session_id, player_id, clues_used, max_clues_allowed, expires_at, started_at FROM rounds WHERE id = ?`,
    )
    .get(roundId) as RoundData | undefined;
}

/**
 * Check if round exists and belongs to session
 */
export function validateRoundOwnership(
  round: RoundData,
  sessionId: string,
): boolean {
  return round.session_id === sessionId;
}

/**
 * Check if round has expired
 */
export function isRoundExpired(round: RoundData): boolean {
  return round.expires_at ? round.expires_at * 1000 < Date.now() : false;
}

/**
 * Get full round with player and stats
 */
export function getRoundWithPlayer(roundId: string) {
  const round = getRound(roundId);
  if (!round) return undefined;

  const player = db
    .prepare(`SELECT id, name FROM players WHERE id = ?`)
    .get(round.player_id) as { id: number; name: string } | undefined;

  return { round, player };
}

/**
 * Update clues used for a round
 */
export function incrementCluesUsed(roundId: string): {
  cluesUsed: number;
  cluesRemaining: number;
} {
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
