import { readBody } from "h3";
import { successResponse, errorResponse } from "../utils/response";
import { logInfo, logError } from "../utils/logger";
import { deleteSession, sessionExists } from "../services/deleteSession";

/**
 * User endpoint to delete their own session data
 * Requires valid sessionId in request body
 *
 * POST /api/deleteSession
 * Body: { "sessionId": "YOUR_SESSION_ID" }
 *
 * Deletes all data associated with the session:
 * - scores
 * - rounds
 * - leaderboard_entries
 * - session itself
 */
export default defineEventHandler(async (event) => {
  // Only allow POST
  if (event.method !== "POST") {
    return errorResponse(405, "Method not allowed", event);
  }

  const body = await readBody(event);
  const sessionId = body?.sessionId as string | undefined;

  // Validate sessionId presence
  if (!sessionId || typeof sessionId !== "string") {
    logError("Missing or invalid sessionId", "deleteSession", {
      provided: sessionId ? typeof sessionId : "none",
    });
    return errorResponse(400, "SessionId is required", event);
  }

  // Validate sessionId format (UUID v4)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    logError("Invalid sessionId format", "deleteSession", {
      sessionId: sessionId.substring(0, 20) + "...",
    });
    return errorResponse(400, "Invalid sessionId format", event);
  }

  // Check if session exists
  if (!sessionExists(sessionId)) {
    logError("Session not found", "deleteSession", { sessionId });
    return errorResponse(404, "Session not found", event);
  }

  try {
    const result = deleteSession(sessionId);

    if (!result.success) {
      return errorResponse(500, "Failed to delete session", event);
    }

    logInfo(
      "Session deletion complete",
      "deleteSession",
      result as unknown as Record<string, unknown>,
    );

    return successResponse(
      {
        message: "Session deleted successfully",
        sessionId: result.sessionId,
        deleted: result.deleted,
      },
      event,
    );
  } catch (error) {
    logError("Failed to delete session", error as Error, "deleteSession");
    return errorResponse(500, "Failed to delete session", event);
  }
});
