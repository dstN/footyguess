/**
 * Client-side logging utilities
 * Mirrors the server logger API (server/utils/logger.ts) for consistency
 *
 * Features:
 * - Only logs in development mode by default
 * - Structured format with context and metadata
 * - Future-ready for integration with error tracking (Sentry, etc.)
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogEntry {
  ts: string;
  level: LogLevel;
  context: string;
  message: string;
  meta?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

/**
 * Check if we should log (only in dev mode unless overridden)
 */
function shouldLog(): boolean {
  // Always log in development, never in production (unless explicitly enabled)
  return import.meta.dev;
}

/**
 * Format error for logging
 */
function formatError(
  err: unknown,
): { message: string; stack?: string } | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

/**
 * Create structured log entry
 */
function createLogEntry(
  level: LogLevel,
  context: string,
  message: string,
  error?: unknown,
  meta?: Record<string, unknown>,
): LogEntry {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    context,
    message,
  };

  if (meta && Object.keys(meta).length > 0) entry.meta = meta;
  if (error) entry.error = formatError(error);

  return entry;
}

/**
 * Debug level logging
 * Use for detailed debugging information
 */
export function logDebug(
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!shouldLog()) return;
  const entry = createLogEntry(
    LogLevel.DEBUG,
    context,
    message,
    undefined,
    meta,
  );
  console.debug(`[${context}]`, message, meta ?? "");

  // Future: send to analytics/monitoring
  void entry; // Suppress unused warning for now
}

/**
 * Info level logging
 * Use for general informational messages
 */
export function logInfo(
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!shouldLog()) return;
  const entry = createLogEntry(
    LogLevel.INFO,
    context,
    message,
    undefined,
    meta,
  );
  console.log(`[${context}]`, message, meta ?? "");

  void entry;
}

/**
 * Warning level logging
 * Use for potentially problematic situations
 */
export function logWarn(
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!shouldLog()) return;
  const entry = createLogEntry(
    LogLevel.WARN,
    context,
    message,
    undefined,
    meta,
  );
  console.warn(`[${context}]`, message, meta ?? "");

  void entry;
}

/**
 * Error level logging
 * Use for errors that need attention
 *
 * @param context - Component/composable name (e.g., "usePlayGame")
 * @param message - Human-readable error description
 * @param error - Optional Error object or unknown error value
 * @param meta - Optional additional context
 *
 * @example
 * logError("usePlayGame", "Failed to record clue", err);
 * logError("useGameSession", "Failed to load player", err, { playerId: 123 });
 */
export function logError(
  context: string,
  message: string,
  error?: unknown,
  meta?: Record<string, unknown>,
): void {
  if (!shouldLog()) return;

  const entry = createLogEntry(LogLevel.ERROR, context, message, error, meta);
  console.error(`[${context}]`, message, error ?? "", meta ?? "");

  // Future: integrate with error tracking service
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     tags: { context },
  //     extra: { message, ...meta },
  //   });
  // }

  void entry;
}
