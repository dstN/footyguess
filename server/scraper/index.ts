import { initSchema } from "../db/schema.ts";
import { spawn } from "child_process";
import { logError } from "../utils/logger.ts";

async function runScraper() {
  console.log("\nInitializing schema...");
  initSchema();

  console.log("Starting scraper...");
  const proc = spawn("tsx", ["server/scraper/scrape-players.ts"], {
    stdio: "inherit",
    shell: true,
  });

  proc.on("close", (code) => {
    if (code !== 0) {
      logError("Scraper failed", new Error(`Exit code ${code}`));
    } else {
      console.log("Scraper finished.");
    }
  });
}

runScraper();
