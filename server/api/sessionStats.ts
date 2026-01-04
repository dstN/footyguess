import { defineEventHandler, getQuery, createError, sendError } from "h3";
import db from "../db/connection";
import { getStreakBonusMultiplier } from "../utils/scoring";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const sessionId = typeof query.sessionId === "string" ? query.sessionId : null;
  if (!sessionId) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "Missing sessionId" }),
    );
  }

  const session = db
    .prepare(
      `SELECT id, streak, best_streak, nickname, total_score FROM sessions WHERE id = ?`,
    )
    .get(sessionId) as
    | { id: string; streak: number; best_streak: number; nickname?: string; total_score?: number }
    | undefined;

  const lastScore = db
    .prepare(
      `
      SELECT s.score, s.base_score, s.time_score, s.streak, r.player_id
      FROM scores s
      JOIN rounds r ON r.id = s.round_id
      WHERE s.session_id = ?
      ORDER BY s.id DESC
      LIMIT 1
    `,
    )
    .get(sessionId) as
    | { score: number; base_score: number; time_score: number; streak: number; player_id: number }
    | undefined;

  const lastPlayer = lastScore
    ? (db
        .prepare(`SELECT name FROM players WHERE id = ?`)
        .get(lastScore.player_id) as { name: string } | undefined)
    : undefined;

  const cachedTotal =
    session?.total_score === null || session?.total_score === undefined
      ? (db
          .prepare(`SELECT IFNULL(SUM(score),0) AS totalScore FROM scores WHERE session_id = ?`)
          .get(sessionId) as { totalScore: number }).totalScore
      : session.total_score;

  return {
    sessionId,
    nickname: session?.nickname ?? null,
    streak: session?.streak ?? 0,
    bestStreak: session?.best_streak ?? 0,
    totalScore: (cachedTotal ?? 0) + (session?.streak ?? 0),
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
            playerName: lastPlayer?.name ?? null,
          };
        })()
      : null,
  };
});
