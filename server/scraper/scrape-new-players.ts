import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";

const BASE_URL = "https://www.transfermarkt.com";

// Top 5 Leagues:
// GB1 (Premier League)
// ES1 (La Liga)
// IT1 (Serie A)
// L1 (Bundesliga)
// FR1 (Ligue 1)

const LEAGUES = [
  {
    id: "GB1",
    name: "Premier League",
    url: "/premier-league/startseite/wettbewerb/GB1",
  },
  { id: "ES1", name: "La Liga", url: "/laliga/startseite/wettbewerb/ES1" },
  { id: "IT1", name: "Serie A", url: "/serie-a/startseite/wettbewerb/IT1" },
  { id: "L1", name: "Bundesliga", url: "/bundesliga/startseite/wettbewerb/L1" },
  { id: "FR1", name: "Ligue 1", url: "/ligue-1/startseite/wettbewerb/FR1" },
];

const SEASON_ID = 2025; // Use current season

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrape a league page to find all clubs
 */
async function scrapeLeagueClubs(league: { id: string; url: string }) {
  console.log(`\n🏆 Scraping League: ${league.id} (${league.url})`);
  const url = `${BASE_URL}${league.url}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    // Parse Club Links from `div.responsive-table` -> `td.hauptlink` -> `a`
    // Looking for: <a title="Bayern Munich" href="/fc-bayern-munchen/startseite/verein/27/saison_id/2025">Bayern Munich</a>

    const clubs = new Map<string, { id: number; name: string; url: string }>();

    // Regex to find club links in the table
    // Matches: <td class="hauptlink ..."> ... <a title="..." href="/.../startseite/verein/(\d+)...">
    // Simplified regex:
    const regex =
      /<td[^>]*class="[^"]*hauptlink[^"]*"[^>]*>\s*<a[^>]*title="([^"]+)"[^>]*href="([^"]+)"/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      const name = match[1];
      let href = match[2];

      // Extract ID
      const idMatch = href.match(/\/verein\/(\d+)/);
      if (idMatch) {
        const id = parseInt(idMatch[1]);

        // Normalize URL to squad URL format
        // Link is usually: /fc-bayern-munchen/startseite/verein/27/saison_id/2025
        // Squad link needed: /fc-bayern-munchen/kader/verein/27/saison_id/${SEASON_ID}

        // Clean href to base club part: /fc-bayern-munchen
        const slug = href.split("/")[1];
        const squadUrl = `/${slug}/kader/verein/${id}/saison_id/${SEASON_ID}`;

        clubs.set(String(id), { id, name, url: squadUrl });
      }
    }

    console.log(`   Found ${clubs.size} clubs.`);
    return Array.from(clubs.values());
  } catch (e) {
    console.error(`   ❌ Failed to scrape league: ${e}`);
    return [];
  }
}

/**
 * Scrape a squad page to find players
 */
async function scrapeSquad(club: { id: number; name: string; url: string }) {
  console.log(`   🏟️  Scraping Squad: ${club.name}`);
  const fullUrl = `${BASE_URL}${club.url}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await response.text();

    // Find players: Look for any link containing /profil/spieler/ inside main link cells
    // Using a simpler regex search for unique profile links
    // <a ... href="/david-raya/profil/spieler/262749" ...>

    const playerRegex = /href="([^"]+\/profil\/spieler\/[^"]+)"/g;

    let match;
    const players = [];
    const seen = new Set<string>();

    while ((match = playerRegex.exec(html)) !== null) {
      const href = match[1];

      if (!seen.has(href)) {
        players.push({ name: "Unknown", url: href });
        seen.add(href);
      }
    }
    console.log(`     Found ${players.length} players.`);
    return players;
  } catch (e) {
    console.error(`     ❌ Failed to scrape squad: ${e}`);
    return [];
  }
}

async function run() {
  initSchema();

  let totalRequests = 0;

  for (const league of LEAGUES) {
    const clubs = await scrapeLeagueClubs(league);

    for (const club of clubs) {
      const players = await scrapeSquad(club);

      for (const p of players) {
        // Check if player exists in PLAYERS table
        const idMatch = p.url.match(/spieler\/(\d+)/);
        if (idMatch) {
          const tmId = parseInt(idMatch[1]);
          const exists = db
            .prepare("SELECT 1 FROM players WHERE tm_id = ?")
            .get(tmId);

          if (!exists) {
            // Check if already requested
            const reqExists = db
              .prepare("SELECT 1 FROM requested_players WHERE url LIKE ?")
              .get(`%${tmId}%`);

            if (!reqExists) {
              // Add to requested
              db.prepare(
                "INSERT INTO requested_players (url, status) VALUES (?, 'pending')",
              ).run(p.url);
              totalRequests++;
            }
          }
        }
      }

      // Be nice to the server
      await sleep(2000);
    }
  }

  console.log(
    `\n✅ Discovery Complete! Added ${totalRequests} new player requests.`,
  );
}

run();
