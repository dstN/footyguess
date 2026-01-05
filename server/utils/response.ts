/**
 * Standardized API Response Types and Utilities
 *
 * All API responses follow this structure for consistency,
 * making it easier to handle responses on the client side
 * and debug API interactions.
 */

import type { H3Event } from "h3";

export interface ApiResponse<T = unknown> {
  /** Unique request identifier for tracing */
  requestId: string;
  /** ISO 8601 timestamp of response */
  timestamp: string;
  /** HTTP status code */
  statusCode: number;
  /** Whether request was successful */
  success: boolean;
  /** Response data (null on error) */
  data: T | null;
  /** Error message if applicable */
  error?: string;
  /** Error details for debugging (dev only) */
  details?: Record<string, unknown>;
}

/**
 * Creates a successful API response
 */
export function successResponse<T>(data: T, event: H3Event): ApiResponse<T> {
  const requestId = event.node.res.getHeader("x-request-id") as string;

  return {
    requestId,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    success: true,
    data,
  };
}

/**
 * Creates an error API response
 */
export function errorResponse(
  statusCode: number,
  error: string,
  event: H3Event,
  details?: Record<string, unknown>,
): ApiResponse {
  const requestId = event.node.res.getHeader("x-request-id") as string;

  const response: ApiResponse = {
    requestId,
    timestamp: new Date().toISOString(),
    statusCode,
    success: false,
    data: null,
    error,
  };

  // Include details in development
  if (process.env.NODE_ENV === "development" && details) {
    response.details = details;
  }

  return response;
}

/**
 * Creates a paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  event: H3Event,
): PaginatedResponse<T> {
  const requestId = event.node.res.getHeader("x-request-id") as string;

  return {
    requestId,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    success: true,
    data,
    pagination: {
      total,
      limit,
      offset,
    },
  };
}
