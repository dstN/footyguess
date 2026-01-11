import { defineEventHandler, readBody } from "h3";
import { spawn } from "child_process";
import db from "../db/connection.ts";
import { enforceRateLimit } from "../utils/rate-limit.ts";
import { parseSchema } from "../utils/validate.ts";
import { AppError, Errors, handleApiError } from "../utils/errors.ts";
import { object, string, minLength, maxLength, pipe } from "valibot";
import { enqueueScrapeJob } from "../scraper/queue.ts";

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("transfermarkt.")) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function getTmId(url: string) {
  const match = url.match(/spieler\/(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

let isProcessing = false;

function kickProcessor() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const proc = spawn("tsx", ["server/scraper/queue-worker.ts"], {
      stdio: "inherit",
      shell: true,
    });
    proc.on("error", (err) => {
      console.error(
        "[kickProcessor] Failed to spawn queue-worker:",
        err.message,
      );
      isProcessing = false;
    });
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[kickProcessor] queue-worker exited with code ${code}`);
      }
      isProcessing = false;
    });
  } catch (err) {
    console.error("[kickProcessor] Error spawning process:", err);
    isProcessing = false;
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ url?: string }>(event);
    const parsed = parseSchema(
      object({
        url: pipe(string(), minLength(1), maxLength(1024)),
      }),
      body,
    );
    if (!parsed.ok) {
      throw Errors.badRequest("Invalid payload");
    }

    const rawUrl = parsed.data.url.trim();
    if (!rawUrl) {
      throw Errors.badRequest("Missing url");
    }

    const url = normalizeUrl(rawUrl);
    if (!url) {
      throw Errors.badRequest("Invalid Transfermarkt URL");
    }

    const rateError = enforceRateLimit(event, {
      key: "requestPlayer",
      windowMs: 5 * 60_000,
      max: 5,
    });
    if (rateError) throw new AppError(429, "Too many requests", "RATE_LIMITED");

    const tmId = getTmId(url);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const staleCutoff = nowSeconds - 60 * 60 * 24 * 7 * 8;

    if (tmId) {
      const existingPlayer = db
        .prepare(`SELECT id, last_scraped_at FROM players WHERE tm_id = ?`)
        .get(tmId) as
        | { id: number; last_scraped_at: number | null }
        | undefined;
      if (
        existingPlayer?.last_scraped_at &&
        existingPlayer.last_scraped_at >= staleCutoff
      ) {
        return {
          status: "already-scraped",
          playerId: existingPlayer.id,
          url,
        };
      }
    }

    const existingRequest = db
      .prepare(`SELECT id, status FROM requested_players WHERE url = ?`)
      .get(url) as { id: number; status: string } | undefined;

    if (existingRequest) {
      if (existingRequest.status !== "pending") {
        db.prepare(
          `UPDATE requested_players SET status = 'pending', error = NULL, updated_at = strftime('%s','now') WHERE id = ?`,
        ).run(existingRequest.id);
      }
    } else {
      db.prepare(
        `INSERT INTO requested_players (url, status) VALUES (?, 'pending')`,
      ).run(url);
    }

    const row = db
      .prepare(
        `SELECT id, status, player_id, error FROM requested_players WHERE url = ?`,
      )
      .get(url) as {
      id: number;
      status: string;
      player_id: number | null;
      error: string | null;
    };

    enqueueScrapeJob({ type: "requested", target: url, priority: 10 });

    if (process.env.NODE_ENV !== "production") {
      kickProcessor();
    }

    return {
      id: row.id,
      status: row.status,
      playerId: row.player_id,
      error: row.error,
      url,
    };
  } catch (error) {
    return handleApiError(event, error, "requestPlayer");
  }
});
