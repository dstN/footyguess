import { defineEventHandler, readBody, createError, sendError } from "h3";
import { spawn } from "child_process";
import db from "../db/connection";
import { enforceRateLimit } from "../utils/rate-limit";

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
  const proc = spawn("tsx", ["server/scraper/process-requested.ts"], {
    stdio: "inherit",
    shell: true,
  });
  proc.on("close", () => {
    isProcessing = false;
  });
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ url?: string }>(event);
    const rawUrl = body?.url?.trim();
    if (!rawUrl) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Missing url" }),
      );
    }

    const url = normalizeUrl(rawUrl);
    if (!url) {
      return sendError(
        event,
        createError({ statusCode: 400, statusMessage: "Invalid Transfermarkt URL" }),
      );
    }

    const rateError = enforceRateLimit(event, {
      key: "requestPlayer",
      windowMs: 5 * 60_000,
      max: 5,
    });
    if (rateError) return sendError(event, rateError);

    const tmId = getTmId(url);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const staleCutoff = nowSeconds - 60 * 60 * 24 * 7 * 8;

    if (tmId) {
      const existingPlayer = db
        .prepare(`SELECT id, last_scraped_at FROM players WHERE tm_id = ?`)
        .get(tmId) as { id: number; last_scraped_at: number | null } | undefined;
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
      .prepare(
        `SELECT id, status FROM requested_players WHERE url = ?`,
      )
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
      .get(url) as { id: number; status: string; player_id: number | null; error: string | null };

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
    console.error("requestPlayer error", error);
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: "Failed to request player" }),
    );
  }
});
