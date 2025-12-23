import { defineEventHandler, readBody, createError, sendError } from "h3";
import db from "../db/connection";

type SubmitType = "round" | "total" | "streak";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      sessionId?: string;
      nickname?: string;
      type?: SubmitType;
    }>(event);

    const sessionId = body?.sessionId?.trim();
    const nickname = body?.nickname?.trim();
    const type = body?.type;

    if (!sessionId || !type) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Missing sessionId or type" }),
      );
    }

    if (!["round", "total", "streak"].includes(type)) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid submission type" }),
      );
    }

    const session = db
      .prepare(`SELECT id FROM sessions WHERE id = ?`)
      .get(sessionId) as { id: string } | undefined;

    if (!session) {
      return sendError(
        event,
        createError({ statusCode: 404, statusMessage: "Session not found" }),
      );
    }

    if (nickname && nickname.length > 32) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Nickname too long" }),
      );
    }

    if (nickname) {
      db.prepare(`UPDATE sessions SET nickname = ? WHERE id = ?`).run(nickname, sessionId);
    }

    let value = 0;
    let baseScore: number | null = null;
    let finalScore: number | null = null;
    let streak: number | null = null;

    if (type === "round") {
      const last = db
        .prepare(
          `
          SELECT s.score, s.base_score, s.streak
          FROM scores s
          WHERE s.session_id = ?
          ORDER BY s.id DESC
          LIMIT 1
        `,
        )
        .get(sessionId) as { score: number; base_score: number; streak: number } | undefined;
      if (!last) {
        return sendError(
          event,
          createError({ statusCode: 400, statusMessage: "No round score available" }),
        );
      }
      const streakBonus = getStreakBonusMultiplier(last.streak ?? 0);
      const timeMultiplier =
        last.base_score && (last.score ?? 0) > 0
          ? (last.score ?? 0) / ((last.base_score ?? 1) * (1 + streakBonus || 1))
          : 1;
      value = Math.round((last.base_score ?? 0) * timeMultiplier); // include time bonus, exclude streak
      baseScore = last.base_score ?? null;
      finalScore = last.score ?? null;
      streak = last.streak ?? null;
    } else if (type === "total") {
      const rows = db
        .prepare(`SELECT score, base_score, streak FROM scores WHERE session_id = ?`)
        .all(sessionId) as Array<{ score: number; base_score: number; streak: number }>;
      value = rows.reduce((acc, row) => {
        const streakBonus = getStreakBonusMultiplier(row.streak ?? 0);
        const timeMultiplier =
          row.base_score && (row.score ?? 0) > 0
            ? (row.score ?? 0) / ((row.base_score ?? 1) * (1 + streakBonus || 1))
            : 1;
        const timeAdjusted = Math.round((row.base_score ?? 0) * timeMultiplier);
        return acc + timeAdjusted;
      }, 0);
    } else if (type === "streak") {
      const row = db
        .prepare(`SELECT best_streak FROM sessions WHERE id = ?`)
        .get(sessionId) as { best_streak: number } | undefined;
      value = row?.best_streak ?? 0;
      streak = value;
    }

    db.prepare(
      `INSERT INTO leaderboard_entries (session_id, type, value, base_score, final_score, streak, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, (SELECT nickname FROM sessions WHERE id = ?), strftime('%s','now'))`,
    ).run(sessionId, type, value, baseScore, finalScore, streak, sessionId);

    return { ok: true, type, value, nickname: nickname ?? null };
  } catch (error) {
    console.error("submitScore error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to submit score" }),
    );
  }
});
