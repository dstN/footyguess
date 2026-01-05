import fs from "fs";
import { initSchema } from "../db/schema.ts";
import { logInfo } from "../utils/logger.ts";
import { enqueueScrapeJob } from "./queue.ts";

const ERROR_LOG = "error.txt";
const MANUAL_LOG = "manual.txt";
const BATCH_SIZE = Number(process.env.RESCRAPE_ERROR_BATCH ?? 100);

function extractName(line: string) {
  const match = line.match(/\]\s*(?:[a-z-]+\s+)?([^:]+):/i);
  if (!match) return null;
  return match[1]?.trim() ?? null;
}

(async () => {
  initSchema();

  if (!fs.existsSync(ERROR_LOG)) {
    console.log("No error.txt found.");
    return;
  }

  const lines = fs.readFileSync(ERROR_LOG, "utf8").split(/\r?\n/);
  const names = new Set<string>();
  const manualNames = new Set<string>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const name = extractName(line);
    if (!name) continue;
    if (line.includes(".responsive-table")) {
      manualNames.add(name);
      continue;
    }
    names.add(name);
  }

  if (manualNames.size) {
    const existingManual = fs.existsSync(MANUAL_LOG)
      ? new Set(
          fs.readFileSync(MANUAL_LOG, "utf8").split(/\r?\n/).filter(Boolean),
        )
      : new Set<string>();
    const toAppend = Array.from(manualNames).filter(
      (name) => !existingManual.has(name),
    );
    if (toAppend.length) {
      fs.appendFileSync(MANUAL_LOG, `${toAppend.join("\n")}\n`, "utf8");
      console.log(`Added ${toAppend.length} manual entries to ${MANUAL_LOG}.`);
    }
  }

  const batch = Array.from(names).slice(0, BATCH_SIZE);
  if (!batch.length) {
    console.log("No names found in error.txt.");
    return;
  }

  batch.forEach((target) => {
    enqueueScrapeJob({ type: "error", target, priority: 5 });
  });
  logInfo(`Enqueued ${batch.length} error scrape jobs`, {
    count: batch.length,
  });
})();
