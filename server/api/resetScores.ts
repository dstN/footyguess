import { readBody } from "h3";
import { successResponse, errorResponse } from "../utils/response";
import { logInfo, logError } from "../utils/logger";
import { resetScores } from "../services/admin";

/**
 * Admin endpoint to reset all game data (sessions, scores, leaderboard, rounds)
 * Requires SCORING_SECRET in request body for authentication
 *
 * POST /api/resetScores
 * Body: { "secret": "YOUR_SCORING_SECRET" }
 *
 * This preserves player data (players, transfers, player_stats, clubs, etc.)
 */
export default defineEventHandler(async (event) => {
  // Only allow POST
  if (event.method !== "POST") {
    return errorResponse(405, "Method not allowed", event);
  }

  const body = await readBody(event);
  const providedSecret = body?.secret as string | undefined;

  // In development mode, allow reset without secret
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    // Check for secret in production
    const expectedSecret = process.env.SCORING_SECRET;
    if (!expectedSecret) {
      logError("SCORING_SECRET not configured", "resetScores");
      return errorResponse(500, "Server misconfiguration", event);
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      logError("Invalid or missing secret", "resetScores", {
        provided: providedSecret ? "[redacted]" : "none",
      });
      return errorResponse(401, "Unauthorized", event);
    }
  }

  try {
    const result = resetScores();

    logInfo(
      "Database reset complete",
      "resetScores",
      result as unknown as Record<string, unknown>,
    );

    return successResponse(
      {
        message: "Database reset complete",
        deleted: result,
      },
      event,
    );
  } catch (error) {
    logError("Failed to reset database", error as Error, "resetScores");
    return errorResponse(500, "Failed to reset database", event);
  }
});
