/**
 * Retry Strategy
 * Implements exponential backoff retry logic for transient failures
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network timeouts, connection errors, DNS issues
    if (
      error.message.includes("timeout") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("ETIMEDOUT")
    ) {
      return true;
    }
    // 5xx server errors are typically retryable
    if (error.message.includes("500") || error.message.includes("503")) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate delay for next attempt with exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt - 1);
  const delay = Math.min(baseDelay, config.maxDelayMs);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(delay + jitter));
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error)) {
        throw lastError;
      }

      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      const delay = calculateBackoffDelay(attempt, config);
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Unknown error in retry logic");
}
