import fs from "fs";
import path from "path";

/**
 * Structured Logging
 * Centralized logging with different levels and formats
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
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

const LOG_DIR = process.env.LOG_DIR || path.resolve("server", "logs");
const MAX_LOG_BYTES = Number(process.env.LOG_MAX_BYTES ?? 5 * 1024 * 1024);
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateLog(filePath: string, maxBytes = MAX_LOG_BYTES) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (stats.size < maxBytes) return;
    const ext = path.extname(filePath);
    const base = ext ? filePath.slice(0, -ext.length) : filePath;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rotated = ext ? `${base}.${stamp}${ext}` : `${base}.${stamp}`;
    fs.renameSync(filePath, rotated);
  } catch {
    // ignore rotation errors
  }
}

function writeLine(fileName: string, payload: LogEntry) {
  ensureDir();
  const filePath = path.join(LOG_DIR, fileName);
  rotateLog(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function formatError(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err) };
  return { message: err.message, stack: err.stack };
}

/**
 * Check if level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const minIndex = levels.indexOf(MIN_LOG_LEVEL);
  return levels.indexOf(level) >= minIndex;
}

/**
 * Create log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  meta?: Record<string, unknown>,
  error?: Error,
): LogEntry {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    message,
  };

  if (context) entry.context = context;
  if (meta) entry.meta = meta;
  if (error) entry.error = formatError(error);

  return entry;
}

/**
 * Debug level logging
 */
export function logDebug(
  message: string,
  context?: string,
  meta?: Record<string, unknown>,
) {
  if (!shouldLog(LogLevel.DEBUG)) return;
  const entry = createLogEntry(LogLevel.DEBUG, message, context, meta);
  console.debug(`[${context || "app"}]`, message, meta ?? "");
  writeLine("server.log", entry);
}

/**
 * Info level logging
 */
export function logInfo(
  message: string,
  context?: string,
  meta?: Record<string, unknown>,
) {
  if (!shouldLog(LogLevel.INFO)) return;
  const entry = createLogEntry(LogLevel.INFO, message, context, meta);
  console.log(`[${context || "app"}]`, message, meta ?? "");
  writeLine("server.log", entry);
}

/**
 * Warning level logging
 */
export function logWarn(
  message: string,
  context?: string,
  meta?: Record<string, unknown>,
) {
  if (!shouldLog(LogLevel.WARN)) return;
  const entry = createLogEntry(LogLevel.WARN, message, context, meta);
  console.warn(`[${context || "app"}]`, message, meta ?? "");
  writeLine("server.log", entry);
}

/**
 * Error level logging
 */
export function logError(
  message: string,
  errorOrContext?: Error | string | unknown,
  contextOrMeta?: string | Record<string, unknown>,
  meta?: Record<string, unknown>,
) {
  if (!shouldLog(LogLevel.ERROR)) return;

  let error: Error | undefined;
  let context: string | undefined;
  let metadata: Record<string, unknown> | undefined;

  // Handle multiple parameter styles
  if (errorOrContext instanceof Error) {
    error = errorOrContext;
    context = typeof contextOrMeta === "string" ? contextOrMeta : undefined;
    metadata = typeof contextOrMeta === "object" ? contextOrMeta : meta;
  } else if (typeof errorOrContext === "string") {
    context = errorOrContext;
    metadata = typeof contextOrMeta === "object" ? contextOrMeta : meta;
  } else {
    error = errorOrContext instanceof Error ? errorOrContext : undefined;
    metadata = typeof contextOrMeta === "object" ? contextOrMeta : meta;
  }

  const entry = createLogEntry(
    LogLevel.ERROR,
    message,
    context,
    metadata,
    error,
  );
  console.error(`[${context || "app"}]`, message, error ?? "", metadata ?? "");
  writeLine("server.log", entry);
}

/**
 * Rotate log file if it exceeds max size
 */
export function rotateTextLog(filePath: string, maxBytes = MAX_LOG_BYTES) {
  rotateLog(filePath, maxBytes);
}
