import { defineEventHandler, readBody, createError, sendError } from "h3";
import db from "../db/connection.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import {
  object,
  optional,
  string,
  picklist,
  maxLength,
  minLength,
  pipe,
} from "valibot";

type SubmitType = "round" | "total" | "streak";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      sessionId?: string;
      nickname?: string;
      type?: SubmitType;
    }>(event);

    const parsed = parseSchema(
      object({
        sessionId: pipe(string(), minLength(1), maxLength(128)),
        nickname: optional(pipe(string(), maxLength(32))),
        type: picklist(["round", "total", "streak"]),
      }),
      body,
    );

    if (!parsed.ok) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid payload" }),
      );
    }

    const sessionId = parsed.data.sessionId.trim();
    const nickname = parsed.data.nickname?.trim();
    const type = parsed.data.type as SubmitType;

    if (!sessionId || !type) {
      return sendError(
        event,
        createError({
          statusCode: 400,
          statusMessage: "Missing sessionId or type",
        }),
      );
    }

    const rateError = enforceRateLimit(event, {
      key: "submitScore",
      windowMs: 60_000,
      max: 3,
      sessionId,
    });
    if (rateError) return sendError(event, rateError);

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

    if (nickname) {
      db.prepare(`UPDATE sessions SET nickname = ? WHERE id = ?`).run(
        nickname,
        sessionId,
      );
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
        .get(sessionId) as
        | {
            score: number;
            base_score: number;
            time_score: number;
            streak: number;
          }
        | undefined;
      if (!last) {
        return sendError(
          event,
          createError({
            statusCode: 400,
            statusMessage: "No round score available",
          }),
        );
      }
      value = last.time_score ?? session?.last_round_time_score ?? 0;
      baseScore = last.base_score ?? null;
      finalScore = last.score ?? null;
      streak = last.streak ?? null;
    } else if (type === "total") {
      if (session?.total_score === null || session?.total_score === undefined) {
        const row = db
          .prepare(
            `SELECT IFNULL(SUM(score),0) AS totalScore FROM scores WHERE session_id = ?`,
          )
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
        `SELECT id, value FROM leaderboard_entries WHERE session_id = ? AND type = ?`,
      )
      .get(sessionId, type) as { id: number; value: number } | undefined;

    const stmt = db.prepare(
      `INSERT INTO leaderboard_entries (session_id, type, value, base_score, final_score, streak, nickname, created_at)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT nickname FROM sessions WHERE id = ?), strftime('%s','now'))
       ON CONFLICT(session_id, type) DO UPDATE SET
         value = excluded.value,
         base_score = excluded.base_score,
         final_score = excluded.final_score,
         streak = excluded.streak,
         nickname = excluded.nickname,
         created_at = excluded.created_at
       WHERE excluded.value > leaderboard_entries.value`,
    );

    stmt.run(sessionId, type, value, baseScore, finalScore, streak, sessionId);

    const finalEntry = db
      .prepare(
        `SELECT value FROM leaderboard_entries WHERE session_id = ? AND type = ?`,
      )
      .get(sessionId, type) as { value: number } | undefined;

    const finalValue = finalEntry?.value ?? value;
    const skipped = existingEntry ? value <= existingEntry.value : false;

    return {
      ok: true,
      type,
      value: finalValue,
      nickname: nickname ?? null,
      skipped,
    };
  } catch (error) {
    logError("submitScore error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to submit score" }),
    );
  }
});
