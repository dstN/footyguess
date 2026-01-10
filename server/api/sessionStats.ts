import { defineEventHandler, getQuery, createError, sendError } from "h3";
import db from "../db/connection.ts";
import { getStreakBonusMultiplier } from "../utils/scoring.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  // Rate limit: 30 requests per 60 seconds per IP
  const rateError = enforceRateLimit(event, {
    key: "sessionStats",
    windowMs: 60_000,
    max: 30,
  });
  if (rateError) return sendError(event, rateError);

  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        sessionId: pipe(string(), minLength(1), maxLength(128)),
      }),
      query,
    );
    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid query" }),
      );
    }

    const sessionId = parsed.data.sessionId;

    const session = db
      .prepare(
        `SELECT id, streak, best_streak, nickname, total_score FROM sessions WHERE id = ?`,
      )
      .get(sessionId) as
      | {
          id: string;
          streak: number;
          best_streak: number;
          nickname?: string;
          total_score?: number;
        }
      | undefined;

    const lastScore = db
      .prepare(
        `
        SELECT s.score, s.base_score, s.time_score, s.malice_penalty, s.streak, r.player_id
        FROM scores s
        JOIN rounds r ON r.id = s.round_id
        WHERE s.session_id = ?
        ORDER BY s.id DESC
        LIMIT 1
      `,
      )
      .get(sessionId) as
      | {
          score: number;
          base_score: number;
          time_score: number;
          malice_penalty?: number;
          streak: number;
          player_id: number;
        }
      | undefined;

    const lastPlayer = lastScore
      ? (db
          .prepare(`SELECT name FROM players WHERE id = ?`)
          .get(lastScore.player_id) as { name: string } | undefined)
      : undefined;

    const cachedTotal =
      session?.total_score === null || session?.total_score === undefined
        ? (
            db
              .prepare(
                `SELECT IFNULL(SUM(score),0) AS totalScore FROM scores WHERE session_id = ?`,
              )
              .get(sessionId) as { totalScore: number }
          ).totalScore
        : session.total_score;

    return {
      sessionId,
      nickname: session?.nickname ?? null,
      streak: session?.streak ?? 0,
      bestStreak: session?.best_streak ?? 0,
      totalScore: cachedTotal ?? 0,
      lastPlayerId: lastScore?.player_id ?? null,
      lastScore: lastScore
        ? (() => {
            const streakBonus = getStreakBonusMultiplier(lastScore.streak ?? 0);
            const timeMultiplier =
              lastScore.base_score && lastScore.time_score
                ? lastScore.time_score / (lastScore.base_score || 1)
                : 1;
            return {
              score: lastScore.score,
              baseScore: lastScore.base_score,
              streak: lastScore.streak,
              streakBonus,
              timeMultiplier,
              malicePenalty: lastScore.malice_penalty ?? 0,
              playerName: lastPlayer?.name ?? null,
            };
          })()
        : null,
      submittedTypes: (() => {
        const entries = db
          .prepare(
            `SELECT type FROM leaderboard_entries WHERE session_id = ? AND nickname IS NOT NULL`,
          )
          .all(sessionId) as { type: string }[];
        return entries.map((e) => e.type);
      })(),
    };
  } catch (error) {
    logError("sessionStats error", error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: "Failed to load session stats",
      }),
    );
  }
});
