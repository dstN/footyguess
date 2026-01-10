/**
 * Application Error Classes
 *
 * Standardized error types for consistent error handling across the app.
 */

import { createError, type H3Event } from "h3";
import { logError } from "./logger.ts";
import { errorResponse } from "./response.ts";

/**
 * Application-level error with structured metadata
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }

  /**
   * Convert to H3 error for throwing
   */
  toH3Error() {
    return createError({
      statusCode: this.statusCode,
      statusMessage: this.message,
      data: { code: this.code, details: this.details },
    });
  }
}

/**
 * Common error factory functions
 */
export const Errors = {
  notFound: (resource: string, id?: string | number) =>
    new AppError(
      404,
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      "NOT_FOUND",
      { resource, id },
    ),

  badRequest: (message: string, details?: Record<string, unknown>) =>
    new AppError(400, message, "BAD_REQUEST", details),

  unauthorized: (message = "Unauthorized") =>
    new AppError(401, message, "UNAUTHORIZED"),

  forbidden: (message = "Forbidden") => new AppError(403, message, "FORBIDDEN"),

  invalidToken: (reason: string) =>
    new AppError(401, `Invalid token: ${reason}`, "INVALID_TOKEN", { reason }),

  rateLimited: () => new AppError(429, "Too many requests", "RATE_LIMITED"),

  internal: (context: string, originalError?: unknown) =>
    new AppError(500, "Internal server error", "INTERNAL_ERROR", {
      context,
      error: String(originalError),
    }),
};

/**
 * Unified error handler for API routes
 *
 * @param event - H3 event
 * @param error - The caught error
 * @param context - Context string for logging
 * @returns Standardized error response
 */
export function handleApiError(
  event: H3Event,
  error: unknown,
  context: string,
) {
  if (error instanceof AppError) {
    logError(error.message, error, error.code);
    return errorResponse(error.statusCode, error.message, event, error.details);
  }

  // Unknown error - wrap if needed
  const err = error instanceof Error ? error : new Error(String(error));
  logError("Unexpected error", err, context);
  return errorResponse(500, "Internal server error", event);
}
