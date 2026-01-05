import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR || path.resolve("server", "logs");
const MAX_LOG_BYTES = Number(process.env.LOG_MAX_BYTES ?? 5 * 1024 * 1024);

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

function writeLine(fileName: string, payload: unknown) {
  ensureDir();
  const filePath = path.join(LOG_DIR, fileName);
  rotateLog(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function formatError(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err) };
  return { message: err.message, stack: err.stack };
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  const payload = { ts: new Date().toISOString(), level: "info", message, ...meta };
  console.log(message, meta ?? "");
  writeLine("server.log", payload);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  const payload = { ts: new Date().toISOString(), level: "warn", message, ...meta };
  console.warn(message, meta ?? "");
  writeLine("server.log", payload);
}

export function logError(message: string, err?: unknown, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level: "error",
    message,
    ...meta,
    error: err ? formatError(err) : undefined,
  };
  console.error(message, err ?? "");
  writeLine("server.log", payload);
}

export function rotateTextLog(filePath: string, maxBytes = MAX_LOG_BYTES) {
  rotateLog(filePath, maxBytes);
}
