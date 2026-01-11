import { defineEventHandler, readBody } from "h3";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { AppError, Errors, handleApiError } from "../utils/errors.ts";
import {
  getSessionForScoring,
  updateSessionNickname,
  getLastRoundScore,
  getPlayerName,
  getExistingEntry,
  getSessionBestStreak,
  getSessionTotalScore,
  upsertLeaderboardEntry,
  getEntryValue,
  type LeaderboardType,
} from "../services/leaderboard.ts";
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
      throw Errors.badRequest("Invalid payload");
    }

    const sessionId = parsed.data.sessionId.trim();
    const nickname = parsed.data.nickname?.trim();
    const type = parsed.data.type as SubmitType;

    if (!sessionId || !type) {
      throw Errors.badRequest("Missing sessionId or type");
    }

    const rateError = enforceRateLimit(event, {
      key: "submitScore",
      windowMs: 60_000,
      max: 10,
      sessionId,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");

    const session = getSessionForScoring(sessionId);
    if (!session) {
      throw Errors.notFound("Session", sessionId);
    }

    if (nickname) {
      updateSessionNickname(sessionId, nickname);
    }

    let value = 0;
    let baseScore: number | null = null;
    let finalScore: number | null = null;
    let streak: number | null = null;
    let playerId: number | undefined;
    let playerName: string | null = null;

    if (type === "round") {
      const last = getLastRoundScore(sessionId);
      if (!last) {
        throw Errors.badRequest("No round score available");
      }

      playerId = last.player_id;
      value = last.time_score ?? session?.last_round_time_score ?? 0;
      baseScore = last.base_score ?? null;
      finalScore = last.score ?? null;
      streak = last.streak ?? null;
      playerName = getPlayerName(playerId);

      const existingPlayerEntry = getExistingEntry(
        sessionId,
        "round",
        playerId,
      );

      if (existingPlayerEntry) {
        if (value <= existingPlayerEntry.value) {
          return {
            ok: true,
            type,
            value: existingPlayerEntry.value,
            nickname: nickname ?? null,
            skipped: true,
            playerName,
            message: `You already have a higher score (${existingPlayerEntry.value}) for this player`,
          };
        }

        upsertLeaderboardEntry({
          sessionId,
          type: "round",
          value,
          baseScore,
          finalScore,
          streak,
          playerId,
          existingEntryId: existingPlayerEntry.id,
        });
      } else {
        upsertLeaderboardEntry({
          sessionId,
          type: "round",
          value,
          baseScore,
          finalScore,
          streak,
          playerId,
        });
      }

      return {
        ok: true,
        type,
        value,
        nickname: nickname ?? null,
        skipped: false,
        playerName,
      };
    } else if (type === "total") {
      value = getSessionTotalScore(sessionId, session?.total_score);
    } else if (type === "streak") {
      value = getSessionBestStreak(sessionId);
      streak = value;
    }

    const existingEntry = getExistingEntry(sessionId, type as LeaderboardType);

    if (existingEntry) {
      if (value > existingEntry.value) {
        upsertLeaderboardEntry({
          sessionId,
          type: type as LeaderboardType,
          value,
          baseScore,
          finalScore,
          streak,
          existingEntryId: existingEntry.id,
        });
      }
    } else {
      upsertLeaderboardEntry({
        sessionId,
        type: type as LeaderboardType,
        value,
        baseScore,
        finalScore,
        streak,
      });
    }

    const finalValue =
      getEntryValue(sessionId, type as LeaderboardType) ?? value;
    const skipped = existingEntry ? value <= existingEntry.value : false;

    return {
      ok: true,
      type,
      value: finalValue,
      nickname: nickname ?? null,
      skipped,
    };
  } catch (error) {
    return handleApiError(event, error, "submitScore");
  }
});
