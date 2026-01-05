import { createError, H3Event } from "h3";

/** Configuration options for rate limiting */
type RateLimitOptions = {
  /** Unique key for this rate limit (e.g., 'guess', 'submitScore', 'clue') */
  key: string;
  /** Time window in milliseconds (e.g., 10000 = 10 seconds) */
  windowMs: number;
  /** Maximum requests allowed in the time window */
  max: number;
  /** Optional session ID for per-session limits (if null, limits by IP only) */
  sessionId?: string | null;
};

/** Internal rate limit bucket tracking count and reset time */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10000;

/**
 * Extract client IP address from request.
 * Checks X-Forwarded-For header first (for proxied requests),
 * falls back to socket.remoteAddress.
 *
 * @param event - H3 event from request handler
 * @returns Client IP address or "unknown"
 *
 * @example
 * const ip = getClientIp(event);
 * // Returns: "192.168.1.100" or "2001:db8::1"
 */
function getClientIp(event: H3Event) {
  const forwarded = event.node.req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return event.node.req.socket.remoteAddress || "unknown";
}

/**
 * Clean up expired rate limit buckets when map exceeds MAX_BUCKETS.
 * Uses lazy cleanup to avoid excessive memory usage.
 *
 * Algorithm:
 * 1. Check if bucket count exceeds MAX_BUCKETS
 * 2. Iterate through all buckets
 * 3. Delete any buckets where resetAt <= current time
 *
 * @param now - Current timestamp in milliseconds
 */
function cleanup(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Enforce rate limiting for a request using a token bucket algorithm.
 *
 * Algorithm:
 * 1. Extract client IP and create key: `${key}:${ip}:${sessionId}`
 * 2. Check if bucket exists and hasn't expired
 * 3. If no bucket or expired: create new bucket with count=1
 * 4. If bucket exists: increment count
 * 5. If count > max: return 429 error with Retry-After header
 * 6. Otherwise: update bucket and return null (allowed)
 *
 * @param event - H3 event from request handler
 * @param options - Rate limit configuration
 * @returns H3 error object if limit exceeded, null otherwise
 *
 * @example
 * // Limit to 10 guesses per 10 seconds per session
 * const error = enforceRateLimit(event, {
 *   key: 'guess',
 *   windowMs: 10_000,
 *   max: 10,
 *   sessionId: userSessionId
 * });
 *
 * if (error) return sendError(event, error);
 * // Process request...
 *
 * @example
 * // Different limits for different actions
 * // guess: 10/10s, clue: 5/10s, submitScore: 3/60s
 */
export function enforceRateLimit(event: H3Event, options: RateLimitOptions) {
  const now = Date.now();
  cleanup(now);

  const ip = getClientIp(event);
  const key = `${options.key}:${ip}:${options.sessionId ?? "anon"}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > options.max) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    event.node.res.setHeader("Retry-After", retryAfterSeconds);
    return createError({
      statusCode: 429,
      statusMessage: "Too many requests",
    });
  }

  buckets.set(key, bucket);
  return null;
}
