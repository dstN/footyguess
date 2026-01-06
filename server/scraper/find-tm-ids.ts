/**
 * Bootstrap script to find TransferMarkt IDs for players
 * Uses TransferMarkt's search API directly
 */

import puppeteer from "puppeteer";
import db from "../db/connection.ts";

interface PlayerData {
  name: string;
  vereinLabel: string;
  matches: string;
  startdatum: string;
}

async function findTmIdViaDuckDuckGo(
  playerName: string,
): Promise<{ tmId: number; url: string } | null> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    // Set viewport to full screen
    await page.setViewport({ width: 1920, height: 1080 });
    page.setDefaultTimeout(15000);

    // Go to DuckDuckGo search
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(playerName + " site:transfermarkt.com")}`;
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
    });

    // Wait for results to load
    await page.waitForSelector("ol.react-results--main", { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Extract tm_id and url from first transfermarkt link in results
    const result = await page.evaluate(() => {
      const resultsList = document.querySelector("ol.react-results--main");
      if (!resultsList) return null;

      const items = resultsList.querySelectorAll("li");
      for (const item of Array.from(items)) {
        // Search for ANY link within this item that starts with transfermarkt URL
        const links = item.querySelectorAll("a");
        for (const link of Array.from(links)) {
          const href = link.getAttribute("href");
          if (href && href.startsWith("https://www.transfermarkt.com")) {
            // Extract tm_id from URL: /spieler/{id}
            const match = href.match(/\/spieler\/(\d+)/);
            if (match && match[1]) {
              return {
                tmId: parseInt(match[1]),
                url: href,
              };
            }
          }
        }
      }
      return null;
    });

    if (result) {
      console.log(`  ✅ ${playerName}: tm_id = ${result.tmId}`);
    } else {
      console.log(`  ❌ No TransferMarkt result found for ${playerName}`);
    }

    await browser.close();
    return result;
  } catch (error) {
    console.log(
      `  ⚠️  Error searching for ${playerName}:`,
      error instanceof Error ? error.message : error,
    );
    if (browser) await browser.close();
    return null;
  }
}

async function testWithRonaldo() {
  console.log("\n🧪 Test: Finding Ronaldo...\n");

  const tmId = await findTmIdViaDuckDuckGo("Ronaldo");

  if (tmId) {
    console.log(`\n✨ Found tm_id: ${tmId}`);
  } else {
    console.log(`\n❌ Failed to find tm_id`);
  }
}

async function findMissingPlayerIds() {
  // Load all_players.json
  const allPlayersData = await import("../../all_players.json", {
    assert: { type: "json" },
  }).then((m) => m.default);

  const allPlayers = allPlayersData as PlayerData[];

  // Get players already in DB
  const existingPlayers = db
    .prepare("SELECT DISTINCT name FROM players")
    .all() as Array<{ name: string }>;
  const existingNames = new Set(existingPlayers.map((p) => p.name));

  // Find missing players
  const missingPlayers = allPlayers.filter((p) => !existingNames.has(p.name));

  console.log(`\n📊 Found ${missingPlayers.length} players not in database\n`);

  let found = 0;
  let failed = 0;

  for (const player of missingPlayers) {
    console.log(`🔍 Searching for: ${player.name} (${player.vereinLabel})`);

    // Use DuckDuckGo search
    const result = await findTmIdViaDuckDuckGo(player.name);

    if (result) {
      found++;
      // Store in DB - skip if tm_id already exists
      try {
        db.prepare(
          "INSERT INTO players (name, tm_id, tm_url) VALUES (?, ?, ?)",
        ).run(player.name, result.tmId, result.url);
      } catch (e: any) {
        if (e.code !== "SQLITE_CONSTRAINT_UNIQUE") {
          console.error(`    ⚠️  Error inserting: ${e.message}`);
        }
        // Otherwise skip - tm_id already exists for another player
      }
    } else {
      failed++;
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `\n✅ Results: Found ${found}, Failed ${failed}, Total ${missingPlayers.length}`,
  );
}

// Run test with JUST Ronaldo
// testWithRonaldo().catch(console.error);

// Uncomment to run full batch (will take a long time):
findMissingPlayerIds().catch(console.error);
