import { spawn } from "child_process";
import db from "../db/connection";
import { initSchema } from "../db/schema";

const BATCH_SIZE = Number(process.env.RESCRAPE_BATCH ?? 100);
const STALE_WEEKS = Number(process.env.RESCRAPE_WEEKS ?? 8);

function runScrape(items: string[]) {
  return new Promise<number>((resolve) => {
    const proc = spawn("tsx", ["server/scraper/scrape-players.ts"], {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        REQUESTED_URLS: JSON.stringify(items),
      },
    });
    proc.on("close", (code) => resolve(code ?? 1));
  });
}

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
  console.log(`Re-scraping ${items.length} players...`);

  const code = await runScrape(items);
  if (code !== 0) {
    console.error(`Re-scrape failed with code ${code}.`);
    process.exitCode = code;
  }
})();
