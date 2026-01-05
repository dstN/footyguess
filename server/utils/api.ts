import { createError, H3Event } from "h3";
import type { BaseSchema } from "valibot";
import { parse } from "valibot";

/**
 * Standard error codes used across the API.
 * Provides consistent error identification and categorization.
 */
export enum ApiErrorCode {
  /** Input validation failed (400) */
  VALIDATION_ERROR = "VALIDATION_ERROR",
  /** Required authentication missing or invalid (401) */
  UNAUTHORIZED = "UNAUTHORIZED",
  /** Insufficient permissions for this action (403) */
  FORBIDDEN = "FORBIDDEN",
  /** Requested resource not found (404) */
  NOT_FOUND = "NOT_FOUND",
  /** Rate limit exceeded (429) */
  RATE_LIMITED = "RATE_LIMITED",
  /** Unexpected server error (500) */
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Standardized error response structure.
 * All API errors should conform to this format for consistent client handling.
 */
export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  timestamp: number;
  path?: string;
}

/**
 * Standardized success response structure.
 * Wraps successful API responses with metadata.
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: number;
}

/**
 * Validate request data against a Valibot schema.
 *
 * Provides centralized validation with consistent error handling.
 * Returns validation error or parsed data.
 *
 * @param schema - Valibot schema to validate against
 * @param data - Data to validate
 * @returns Object with ok: true and parsed data, or ok: false with error message
 *
 * @example
 * const schema = v.object({
 *   name: v.pipe(v.string(), v.minLength(1)),
 *   age: v.pipe(v.number(), v.minValue(0))
 * });
 *
 * const result = validateRequest(schema, req.body);
 * if (!result.ok) {
 *   return sendError(event, result.error);
 * }
 *
 * const { name, age } = result.data;
 */
export function validateRequest<TSchema extends BaseSchema<any, any, any>>(
  schema: TSchema,
  data: unknown,
): { ok: true; data: any } | { ok: false; error: ReturnType<typeof createError> } {
  try {
    const parsed = parse(schema, data);
    return { ok: true, data: parsed };
  } catch (err: any) {
    const message = err?.message ?? "Invalid request data";
    return {
      ok: false,
      error: createError({
        statusCode: 400,
        statusMessage: message,
      }),
    };
  }
}

/**
 * Create a standardized API error response.
 *
 * @param code - ApiErrorCode enum value
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @returns H3 error object suitable for sendError()
 *
 * @example
 * return sendError(event, apiError(ApiErrorCode.NOT_FOUND, "Player not found", 404));
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  statusCode: number = 400,
) {
  return createError({
    statusCode,
    statusMessage: message,
    data: {
      code,
      message,
      timestamp: Date.now(),
    },
  });
}

/**
 * Create a standardized success response.
 * Wraps response data with consistent metadata.
 *
 * @param data - Response data to wrap
 * @returns Standardized success response object
 *
 * @example
 * const player = db.prepare('SELECT * FROM players WHERE id = ?').get(1);
 * return apiSuccess(player);
 * // Returns: { success: true, data: {...}, timestamp: 1234567890 }
 */
export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}
