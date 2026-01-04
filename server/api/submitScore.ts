import { defineEventHandler, readBody, createError, sendError } from "h3";
import db from "../db/connection";
import { enforceRateLimit } from "../utils/rate-limit";

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

    const rateError = enforceRateLimit(event, {
      key: "submitScore",
      windowMs: 60_000,
      max: 3,
      sessionId,
    });
    if (rateError) return sendError(event, rateError);

    if (!["round", "total", "streak"].includes(type)) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid submission type" }),
      );
    }

    const session = db
      .prepare(
        `SELECT id, total_score, last_round_score, last_round_base, last_round_time_score FROM sessions WHERE id = ?`,
      )
      .get(sessionId) as
      | {
          id: string;
          total_score: number;
          last_round_score: number | null;
          last_round_base: number | null;
          last_round_time_score: number | null;
        }
      | undefined;

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
          SELECT s.score, s.base_score, s.time_score, s.streak
          FROM scores s
          WHERE s.session_id = ?
          ORDER BY s.id DESC
          LIMIT 1
        `,
        )
        .get(sessionId) as { score: number; base_score: number; time_score: number; streak: number } | undefined;
      if (!last) {
        return sendError(
          event,
          createError({ statusCode: 400, statusMessage: "No round score available" }),
        );
      }
      value = last.time_score ?? session?.last_round_time_score ?? 0;
      baseScore = last.base_score ?? null;
      finalScore = last.score ?? null;
      streak = last.streak ?? null;
    } else if (type === "total") {
      if (session?.total_score === null || session?.total_score === undefined) {
        const row = db
          .prepare(`SELECT IFNULL(SUM(score),0) AS totalScore FROM scores WHERE session_id = ?`)
          .get(sessionId) as { totalScore: number };
        value = row.totalScore ?? 0;
      } else {
        value = session.total_score ?? 0;
      }
    } else if (type === "streak") {
      const row = db
        .prepare(`SELECT best_streak FROM sessions WHERE id = ?`)
        .get(sessionId) as { best_streak: number } | undefined;
      value = row?.best_streak ?? 0;
      streak = value;
    }

    const existingEntry = db
      .prepare(
        `SELECT id, value FROM leaderboard_entries WHERE session_id = ? AND type = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(sessionId, type) as { id: number; value: number } | undefined;

    if (existingEntry && value <= existingEntry.value) {
      return {
        ok: true,
        type,
        value: existingEntry.value,
        nickname: nickname ?? null,
        skipped: true,
      };
    }

    if (existingEntry) {
      db.prepare(
        `UPDATE leaderboard_entries
         SET value = ?, base_score = ?, final_score = ?, streak = ?, nickname = (SELECT nickname FROM sessions WHERE id = ?), created_at = strftime('%s','now')
         WHERE id = ?`,
      ).run(value, baseScore, finalScore, streak, sessionId, existingEntry.id);
    } else {
      db.prepare(
        `INSERT INTO leaderboard_entries (session_id, type, value, base_score, final_score, streak, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, (SELECT nickname FROM sessions WHERE id = ?), strftime('%s','now'))`,
      ).run(sessionId, type, value, baseScore, finalScore, streak, sessionId);
    }

    return { ok: true, type, value, nickname: nickname ?? null };
  } catch (error) {
    console.error("submitScore error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to submit score" }),
    );
  }
});
