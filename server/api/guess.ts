import { createError, defineEventHandler, readBody, sendError } from "h3";
import db from "../db/connection.ts";
import { verifyRoundToken } from "../utils/tokens.ts";
import { computeDifficulty } from "../utils/difficulty.ts";
import { calculateScore } from "../utils/scoring.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      roundId?: string;
      token?: string;
      guess?: string;
    }>(event);

    const parsed = parseSchema(
      object({
        roundId: pipe(string(), minLength(1), maxLength(128)),
        token: pipe(string(), minLength(1), maxLength(2048)),
        guess: pipe(string(), minLength(1), maxLength(128)),
      }),
      body,
    );

    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid payload" }),
      );
    }

    const payload = verifyRoundToken(parsed.data.token);
    if (payload.roundId !== parsed.data.roundId) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Round mismatch" }),
      );
    }

    const rateError = enforceRateLimit(event, {
      key: "guess",
      windowMs: 10_000,
      max: 10,
      sessionId: payload.sessionId,
    });
    if (rateError) return sendError(event, rateError);

    const round = db
      .prepare(
        `SELECT id, session_id, player_id, clues_used, expires_at, started_at FROM rounds WHERE id = ?`,
      )
      .get(parsed.data.roundId) as
      | {
          id: string;
          session_id: string;
          player_id: number;
          clues_used: number;
          expires_at: number | null;
          started_at: number | null;
        }
      | undefined;

    if (!round) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Round not found" }),
      );
    }

    const existingScore = db
      .prepare(`SELECT id FROM scores WHERE round_id = ?`)
      .get(round.id) as { id: number } | undefined;
    if (existingScore) {
      return sendError(
        event,
        createError({ statusCode: 409, statusMessage: "Round already scored" }),
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
      .prepare(`SELECT id, name FROM players WHERE id = ?`)
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
    db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(
      round.session_id,
    );

    const sessionRow = db
      .prepare(`SELECT streak, best_streak FROM sessions WHERE id = ?`)
      .get(round.session_id) as { streak: number; best_streak: number };

    const normalizedGuess = parsed.data.guess.trim().toLowerCase();
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

    const earnedScore = correct ? breakdown.finalScore : 0;
    const earnedBase = correct ? breakdown.preStreak : 0;
    const earnedTime = correct ? breakdown.timeScore : 0;

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
        round.session_id,
      );

      db.prepare(
        `INSERT INTO scores (session_id, round_id, score, base_score, time_score, correct, streak, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(round_id) DO NOTHING`,
      ).run(
        round.session_id,
        round.id,
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
      score: correct ? breakdown.finalScore : 0,
      breakdown,
      streak: nextStreak,
      bestStreak: nextBest,
      sessionId: round.session_id,
      playerName: player.name,
      difficulty,
    };
  } catch (error) {
    logError("guess error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to submit guess" }),
    );
  }
});
