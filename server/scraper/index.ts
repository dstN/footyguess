// 📁 server/scraper/index.ts
import { initSchema } from "../db/schema";
import { spawn } from "child_process";

async function runScraper() {
  console.log("\n📦 Initialisiere Schema...");
  initSchema();

  console.log("🚀 Starte Scraper...");
  const proc = spawn("tsx", ["server/scraper/scrape-players.ts"], {
    stdio: "inherit",
    shell: true,
  });

  proc.on("close", (code) => {
    if (code !== 0) {
      console.error("❌ Scraper fehlgeschlagen mit Code:", code);
    } else {
      console.log("✅ Scraper erfolgreich abgeschlossen.");
    }
  });
}

runScraper();
