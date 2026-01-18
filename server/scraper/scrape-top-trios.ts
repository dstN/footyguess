import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";

const BASE_URL = "https://www.transfermarkt.com/scorer/toptrios/statistik";

// 1976 to 2025
const START_YEAR = 1976;
const END_YEAR = 2025;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeYear(year: number) {
  console.log(`\n📅 Scraping Top Trios for Season: ${year}`);
  // URL: https://www.transfermarkt.com/scorer/toptrios/statistik/2025/plus/0?saison_id=2025&selectedOptionKey=1&yt0=Show
  const url = `${BASE_URL}/${year}/plus/0?saison_id=${year}&selectedOptionKey=1&yt0=Show`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`   ❌ Failed to fetch: ${response.status}`);
      return 0;
    }

    const html = await response.text();

    // Strategy:
    // User Requirement: "no only the players WITHIN the table.inline-table are allowed."
    // So we find all <table class="inline-table"> blocks first.

    // Regex for inline tables
    const tableRegex =
      /<table[^>]*class="[^"]*inline-table[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
    let tableMatch;

    // USE A MAP TO DEDUPLICATE BY ID
    // Map<tmId (string), profileUrl (string)>
    const playersById = new Map<string, string>();

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1];

      // Now find player links inside this table block
      // Links: /slug/leistungsdaten/spieler/ID or /slug/profil/spieler/ID
      // Regex to find any link containing /spieler/ID
      const linkRegex = /href="([^"]+\/spieler\/\d+[^"]*)"/g;

      let linkMatch;

      while ((linkMatch = linkRegex.exec(tableContent)) !== null) {
        let href = linkMatch[1];

        // Extract ID
        const idMatch = href.match(/\/spieler\/(\d+)/);
        if (idMatch) {
          const id = idMatch[1];

          // DEDUPLICATION CHECK
          if (!playersById.has(id)) {
            // Extract slug (index 1 after split by /)
            const parts = href.split("/");
            // Basic valid check
            if (parts.length > 2) {
              const slug = parts[1];
              // Manually construct the canonical profile URL
              // This converts /leistungsdaten/ -> /profil/
              // We need to be careful with the BASE_URL replacement
              // BASE_URL is https://www.transfermarkt.com/scorer/toptrios/statistik
              // We want https://www.transfermarkt.com
              const rootUrl = "https://www.transfermarkt.com";
              const profileUrl = `${rootUrl}/${slug}/profil/spieler/${id}`;
              playersById.set(id, profileUrl);
            }
          }
        }
      }
    }

    console.log(`   found ${playersById.size} unique players.`);

    let queued = 0;
    for (const [idStr, playerUrl] of playersById) {
      const tmId = parseInt(idStr);

      // Check existence
      const exists = db
        .prepare("SELECT 1 FROM players WHERE tm_id = ?")
        .get(tmId);
      if (!exists) {
        const reqExists = db
          .prepare("SELECT 1 FROM requested_players WHERE url LIKE ?")
          .get(`%${tmId}%`);
        if (!reqExists) {
          db.prepare(
            "INSERT INTO requested_players (url, status) VALUES (?, 'pending')",
          ).run(playerUrl);
          queued++;
        }
      }
    }

    if (queued > 0) console.log(`   ✨ Queued ${queued} new players.`);
    else console.log(`   ✅ All players known.`);

    return queued;
  } catch (e) {
    console.error(`   ❌ Error: ${e}`);
    return 0;
  }
}

async function run() {
  initSchema();
  console.log("🚀 Starting Top Trios Scraper (Historical)...");

  let totalQueued = 0;

  // Iterate backwards from current year
  for (let year = END_YEAR; year >= START_YEAR; year--) {
    const count = await scrapeYear(year);
    totalQueued += count;
    await sleep(1500); // Be polite
  }

  console.log(`\n🎉 Done! Total new players queued: ${totalQueued}`);
}

run();
