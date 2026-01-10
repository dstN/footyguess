import { defineEventHandler, getQuery, createError, sendError } from "h3";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import {
  getLeaderboard,
  searchPlayersForLeaderboard,
  type LeaderboardType,
} from "../services/leaderboard.ts";
import { object, optional, string, maxLength, pipe, picklist } from "valibot";

export default defineEventHandler(async (event) => {
  // Rate limit: 30 requests per 60 seconds per IP
  const rateError = enforceRateLimit(event, {
    key: "leaderboard",
    windowMs: 60_000,
    max: 30,
  });
  if (rateError) return sendError(event, rateError);

  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        type: optional(picklist(["all", "round", "total", "streak"])),
        limit: optional(pipe(string(), maxLength(3))),
        playerId: optional(pipe(string(), maxLength(20))),
        searchPlayer: optional(pipe(string(), maxLength(64))),
      }),
      query,
    );

    if (!parsed.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid query parameters",
      });
    }

    const type = (parsed.data.type || "all") as LeaderboardType;
    const limit = Math.min(Number(parsed.data.limit) || 10, 50);
    const playerId = parsed.data.playerId
      ? Number(parsed.data.playerId)
      : undefined;
    const searchPlayer = parsed.data.searchPlayer;

    // If searching for players by name
    if (searchPlayer) {
      return { players: searchPlayersForLeaderboard(searchPlayer) };
    }

    return getLeaderboard(type, limit, playerId);
  } catch (error) {
    logError("leaderboard error", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch leaderboard",
    });
  }
});
