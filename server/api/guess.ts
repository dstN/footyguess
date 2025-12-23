import {
  createError,
  defineEventHandler,
  readBody,
  sendError,
} from "h3";
import db from "../db/connection";
import { verifyRoundToken } from "../utils/tokens";
import { computeDifficulty } from "../utils/difficulty";
import { calculateScore } from "../utils/scoring";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      roundId?: string;
      token?: string;
      guess?: string;
    }>(event);

    if (!body?.roundId || !body?.token || typeof body.guess !== "string") {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Missing roundId, token, or guess" }),
      );
    }

    const payload = verifyRoundToken(body.token);
    if (payload.roundId !== body.roundId) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Round mismatch" }),
      );
    }

    const round = db
      .prepare(
        `SELECT id, session_id, player_id, clues_used, expires_at, started_at FROM rounds WHERE id = ?`,
      )
      .get(body.roundId) as
      | { id: string; session_id: string; player_id: number; clues_used: number; expires_at: number | null; started_at: number | null }
      | undefined;

    if (!round) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Round not found" }),
      );
    }

    if (round.session_id !== payload.sessionId) {
      return sendError(
        event,
        createError({ statusCode: 401, statusMessage: "Unauthorized round" }),
      );
    }

    if (round.expires_at && round.expires_at * 1000 < Date.now()) {
      return sendError(
        event,
        createError({ statusCode: 410, statusMessage: "Round expired" }),
      );
    }

    const player = db
      .prepare(
        `SELECT id, name FROM players WHERE id = ?`,
      )
      .get(round.player_id) as { id: number; name: string } | undefined;

    if (!player) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Player not found" }),
      );
    }

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
      .all(player.id) as Array<{ appearances: number; competition_id: string }>;

    const difficulty = computeDifficulty(stats);

    // Ensure session exists
    db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(round.session_id);

    const sessionRow = db
      .prepare(`SELECT streak, best_streak FROM sessions WHERE id = ?`)
      .get(round.session_id) as { streak: number; best_streak: number };

    const normalizedGuess = body.guess.trim().toLowerCase();
    const correct = normalizedGuess === player.name.trim().toLowerCase();

    const elapsedSeconds = round.started_at
      ? Math.max(0, Math.floor(Date.now() / 1000) - round.started_at)
      : undefined;
    const breakdown = calculateScore(
      difficulty,
      round.clues_used,
      sessionRow?.streak ?? 0,
      { elapsedSeconds },
    );
    const nextStreak = correct ? (sessionRow?.streak ?? 0) + 1 : 0;
    const nextBest = Math.max(sessionRow?.best_streak ?? 0, nextStreak);

    db.prepare(
      `UPDATE sessions SET streak = ?, best_streak = ? WHERE id = ?`,
    ).run(nextStreak, nextBest, round.session_id);

    db.prepare(
      `INSERT INTO scores (session_id, round_id, score, base_score, correct, streak, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      round.session_id,
      round.id,
      correct ? breakdown.finalScore : 0,
      correct ? breakdown.preStreak : 0,
      correct ? 1 : 0,
      nextStreak,
      Math.floor(Date.now() / 1000),
    );

    return {
      correct,
      score: correct ? breakdown.finalScore : 0,
      breakdown,
      streak: nextStreak,
      bestStreak: nextBest,
      sessionId: round.session_id,
      playerName: player.name,
      difficulty,
    };
  } catch (error) {
    console.error("guess error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to submit guess" }),
    );
  }
});
