import { spawn } from "child_process";
import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { logError } from "../utils/logger.ts";
import {
  enqueueScrapeJob,
  getNextJob,
  markJobDone,
  markJobFailed,
  markJobProcessing,
} from "./queue.ts";

const BATCH_SIZE = Number(process.env.SCRAPE_QUEUE_BATCH ?? 10);
const MAX_ATTEMPTS = Number(process.env.SCRAPE_QUEUE_MAX_ATTEMPTS ?? 3);

function runScrape(target: string) {
  return new Promise<number>((resolve) => {
    const proc = spawn("tsx", ["server/scraper/scrape-players.ts"], {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        REQUESTED_URLS: JSON.stringify([target]),
      },
    });
    proc.on("close", (code) => resolve(code ?? 1));
  });
}

function getTmId(url: string) {
  const match = url.match(/spieler\/(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function nextBackoff(attempts: number) {
  const delay = Math.min(3600, Math.pow(2, attempts) * 60);
  return Math.floor(Date.now() / 1000) + delay;
}

(async () => {
  initSchema();

  for (let i = 0; i < BATCH_SIZE; i += 1) {
    const job = getNextJob();
    if (!job) break;

    markJobProcessing(job.id);
    if (job.type === "requested") {
      db.prepare(
        `UPDATE requested_players
         SET status = 'processing', updated_at = strftime('%s','now')
         WHERE url = ?`,
      ).run(job.target);
    }
    const code = await runScrape(job.target);
    if (code === 0) {
      markJobDone(job.id);

      if (job.type === "requested") {
        const tmId = getTmId(job.target);
        const playerRow = tmId
          ? (db.prepare(`SELECT id FROM players WHERE tm_id = ?`).get(tmId) as
              | { id: number }
              | undefined)
          : undefined;
        db.prepare(
          `UPDATE requested_players
           SET status = 'done', player_id = ?, error = NULL, updated_at = strftime('%s','now')
           WHERE url = ?`,
        ).run(playerRow?.id ?? null, job.target);
      }
    } else {
      const attempts = job.attempts + 1;
      const retryAt = attempts >= MAX_ATTEMPTS ? null : nextBackoff(attempts);
      markJobFailed(
        job.id,
        `scrape exited with code ${code}`,
        attempts,
        retryAt,
      );

      if (job.type === "requested") {
        db.prepare(
          `UPDATE requested_players
           SET status = 'failed', error = ?, updated_at = strftime('%s','now')
           WHERE url = ?`,
        ).run(`scrape exited with code ${code}`, job.target);
      }

      logError("Queue scrape failed", new Error(`Exit code ${code}`), {
        jobId: job.id,
        target: job.target,
      });
    }
  }
})();
