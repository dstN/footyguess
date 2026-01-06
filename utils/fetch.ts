/**
 * Fetch configuration utilities
 * Provides consistent timeout and error handling for $fetch calls
 */

/**
 * Default timeout for API requests in milliseconds
 */
export const DEFAULT_FETCH_TIMEOUT = 30000; // 30 seconds

/**
 * Create an AbortSignal that will timeout after the specified duration
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns AbortSignal
 */
export function createTimeoutSignal(
  timeoutMs = DEFAULT_FETCH_TIMEOUT,
): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Merge user-provided signal with timeout signal
 * Returns a combined signal that aborts when either triggers
 * @param signal - Optional user-provided AbortSignal
 * @param timeoutMs - Timeout in milliseconds
 */
export function withTimeout(
  signal?: AbortSignal | null,
  timeoutMs = DEFAULT_FETCH_TIMEOUT,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!signal) {
    return timeoutSignal;
  }

  // Use AbortSignal.any to combine signals (Node 20+, modern browsers)
  return AbortSignal.any([signal, timeoutSignal]);
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === "TimeoutError" ||
      error.message.includes("timeout") ||
      error.message.includes("timed out")
    );
  }
  return false;
}
