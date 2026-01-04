import { createError, H3Event } from "h3";

type RateLimitOptions = {
  key: string;
  windowMs: number;
  max: number;
  sessionId?: string | null;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10000;

function getClientIp(event: H3Event) {
  const forwarded = event.node.req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return event.node.req.socket.remoteAddress || "unknown";
}

function cleanup(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function enforceRateLimit(
  event: H3Event,
  options: RateLimitOptions,
) {
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
