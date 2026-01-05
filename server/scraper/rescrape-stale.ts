import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { logInfo } from "../utils/logger.ts";
import { enqueueScrapeJob } from "./queue.ts";

const BATCH_SIZE = Number(process.env.RESCRAPE_BATCH ?? 100);
const STALE_WEEKS = Number(process.env.RESCRAPE_WEEKS ?? 8);

(async () => {
  initSchema();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const staleCutoff = nowSeconds - 60 * 60 * 24 * 7 * STALE_WEEKS;

  const rows = db
    .prepare(
      `
      SELECT name, tm_url, last_scraped_at
      FROM players
      WHERE last_scraped_at IS NULL OR last_scraped_at < ?
      ORDER BY last_scraped_at IS NOT NULL, last_scraped_at ASC
      LIMIT ?
    `,
    )
    .all(staleCutoff, BATCH_SIZE) as Array<{
    name: string;
    tm_url: string | null;
  }>;

  if (!rows.length) {
    console.log("No stale players to re-scrape.");
    return;
  }

  const items = rows.map((row) => row.tm_url || row.name).filter(Boolean);
  if (!items.length) {
    console.log("No stale players to enqueue.");
    return;
  }

  items.forEach((target) => {
    enqueueScrapeJob({ type: "stale", target, priority: 1 });
  });

  logInfo(`Enqueued ${items.length} stale scrape jobs`, {
    count: items.length,
  });
})();
