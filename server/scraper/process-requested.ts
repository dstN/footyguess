import { spawn } from "child_process";
import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { logError } from "../utils/logger.ts";

function runScrape(url: string) {
  return new Promise<number>((resolve) => {
    const proc = spawn("tsx", ["server/scraper/scrape-players.ts"], {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        REQUESTED_URLS: JSON.stringify([url]),
      },
    });
    proc.on("close", (code) => resolve(code ?? 1));
  });
}

function getTmId(url: string) {
  const match = url.match(/spieler\/(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

(async () => {
  initSchema();

  const pending = db
    .prepare(
      `SELECT id, url FROM requested_players WHERE status = 'pending' ORDER BY id ASC`,
    )
    .all() as Array<{ id: number; url: string }>;

  if (!pending.length) {
    console.log("No pending player requests.");
    return;
  }

  for (const req of pending) {
    db.prepare(
      `UPDATE requested_players SET status = 'processing', updated_at = strftime('%s','now') WHERE id = ?`,
    ).run(req.id);

    const code = await runScrape(req.url);
    if (code === 0) {
      const tmId = getTmId(req.url);
      const playerRow = tmId
        ? (db.prepare(`SELECT id FROM players WHERE tm_id = ?`).get(tmId) as
            | { id: number }
            | undefined)
        : undefined;
      db.prepare(
        `UPDATE requested_players SET status = 'done', player_id = ?, updated_at = strftime('%s','now') WHERE id = ?`,
      ).run(playerRow?.id ?? null, req.id);
    } else {
      db.prepare(
        `UPDATE requested_players SET status = 'failed', error = ?, updated_at = strftime('%s','now') WHERE id = ?`,
      ).run(`scrape exited with code ${code}`, req.id);
      logError(
        "Requested player scrape failed",
        new Error(`Exit code ${code}`),
        {
          requestId: req.id,
          url: req.url,
        },
      );
    }
  }
})();
