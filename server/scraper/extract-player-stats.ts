/**
 * Modular player stats scraper
 * Exports functions to fetch and save player statistics
 */

import db from "../db/connection.ts";

interface FieldPlayerStats {
  competition: string;
  competitionId: string | null;
  appearances: number;
  goals: number;
  assists: number;
  ownGoals: number;
  subbedOn: number;
  subbedOff: number;
  yellowCards: number;
  yellowRedCards: number;
  redCards: number;
  penaltyGoals: number;
  avgMinutesPerGoal: number;
  minutesPlayed: number;
}

interface GoalkeeperStats {
  competition: string;
  competitionId: string | null;
  appearances: number;
  goals: number;
  ownGoals: number;
  subbedOn: number;
  subbedOff: number;
  yellowCards: number;
  yellowRedCards: number;
  redCards: number;
  goalsConceded: number;
  cleanSheets: number;
  minutesPlayed: number;
}

type PlayerStats = FieldPlayerStats | GoalkeeperStats;

const BASE_URL = "https://www.transfermarkt.com";

/**
 * Build the stats URL from a player's profile URL
 */
function buildStatsUrl(profileUrl: string): string {
  const match = profileUrl.match(/\/([^/]+)\/profil\/spieler\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid profile URL: ${profileUrl}`);
  }

  const [, playerName, tmId] = match;
  return `${BASE_URL}/${playerName}/leistungsdaten/spieler/${tmId}/saison//plus/1`;
}

/**
 * Extract text content from HTML, removing extra whitespace
 */
function getCellText(cellHtml: string): string {
  return cellHtml
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Parse numeric value, handling dashes and special characters.
 * TransferMarkt uses European number format where "." is a thousands separator
 * (e.g., "25.000" means 25000, not 25).
 */
function parseSafe(value: string): number {
  // First, remove all non-digit, non-dot, non-dash characters
  let cleaned = value.replace(/[^\d.-]/g, "");
  // Remove dots used as thousands separators (dot followed by exactly 3 digits)
  // This handles patterns like "25.000" -> "25000" or "1.234.567" -> "1234567"
  cleaned = cleaned.replace(/\.(\d{3})(?=\d{0,2}(?:\.|$))/g, "$1");
  // Also handle the simpler case of a single thousands separator
  cleaned = cleaned.replace(/\.(\d{3})$/g, "$1");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract competition ID from a transfermarkt competition URL or code
 * Takes the last segment of the URL path, which is always the competition ID
 * Examples:
 *   https://www.transfermarkt.com/laliga/startseite/wettbewerb/ES1 -> ES1
 *   https://www.transfermarkt.com/uefa-champions-league/startseite/pokalwettbewerb/CL -> CL
 */
function extractCompetitionId(cellContent: string): string | null {
  // Extract href from link
  const hrefMatch = cellContent.match(/href="([^"]+)"/);
  if (!hrefMatch) {
    // No link found - try to extract ID from text content
    const text = getCellText(cellContent).trim();
    // If it's just the competition name with no link, we can't get an ID
    return null;
  }

  const href = hrefMatch[1];
  // Get the last segment after the final /
  const segments = href.split("/");
  const lastSegment = segments[segments.length - 1];

  // Return only if it's not empty and looks like a valid ID (alphanumeric)
  return lastSegment && /^[A-Z0-9]+$/.test(lastSegment) ? lastSegment : null;
}

/**
 * Fetch player stats from TransferMarkt
 */
export async function fetchPlayerStats(
  profileUrl: string,
  playerId: number,
): Promise<{ stats: PlayerStats[]; totals: any; isGoalkeeper: boolean }> {
  try {
    const player = db
      .prepare(`SELECT main_position FROM players WHERE id = ?`)
      .get(playerId) as any;

    const isGoalkeeper = player?.main_position === "Goalkeeper";

    const statsUrl = buildStatsUrl(profileUrl);
    console.log(`       📍 Stats URL: ${statsUrl}`);
    console.log(
      `       🎯 Position: ${player?.main_position || "Unknown"} ${isGoalkeeper ? "🧤" : "⚽"}`,
    );

    const response = await fetch(statsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract all tables - the stats table is usually the second one
    const tableMatches = html.match(/<table[^>]*>([\s\S]*?)<\/table>/g) || [];
    if (tableMatches.length < 2) {
      console.log(
        `       ⚠️  Expected 2+ tables, found ${tableMatches.length}`,
      );
      throw new Error("Stats table not found");
    }

    // Use second table (first is filter dropdown)
    const table = tableMatches[1];
    const rowMatches = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];

    console.log(
      `       📊 Found ${rowMatches.length} rows in table (including header)`,
    );

    const stats: PlayerStats[] = [];

    // Parse data rows (skip header, start at index 1)
    for (let i = 1; i < rowMatches.length; i++) {
      const row = rowMatches[i];

      // Skip summary rows
      if (row.includes("total-") || row.includes("<tfoot")) {
        continue;
      }

      const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];

      if (isGoalkeeper && cellMatches.length >= 13) {
        // Goalkeeper stats (13 columns):
        // 0: image, 1: competition, 2: appearances, 3: goals, 4: own goals,
        // 5: subbed on, 6: subbed off, 7: yellow, 8: yellow-red, 9: red,
        // 10: goals conceded, 11: clean sheets, 12: minutes played
        const competitionCell = cellMatches[1];
        const competitionId = extractCompetitionId(competitionCell);
        const competition = getCellText(competitionCell);

        const appearances = parseSafe(getCellText(cellMatches[2]));
        const goals = parseSafe(getCellText(cellMatches[3]));
        const ownGoals = parseSafe(getCellText(cellMatches[4]));
        const subbedOn = parseSafe(getCellText(cellMatches[5]));
        const subbedOff = parseSafe(getCellText(cellMatches[6]));
        const yellowCards = parseSafe(getCellText(cellMatches[7]));
        const yellowRedCards = parseSafe(getCellText(cellMatches[8]));
        const redCards = parseSafe(getCellText(cellMatches[9]));
        const goalsConceded = parseSafe(getCellText(cellMatches[10]));
        const cleanSheets = parseSafe(getCellText(cellMatches[11]));
        const minutesPlayed = parseSafe(getCellText(cellMatches[12]));

        stats.push({
          competition,
          competitionId,
          appearances,
          goals,
          ownGoals,
          subbedOn,
          subbedOff,
          yellowCards,
          yellowRedCards,
          redCards,
          goalsConceded,
          cleanSheets,
          minutesPlayed,
        });
      } else if (!isGoalkeeper && cellMatches.length >= 14) {
        // Field player stats (14 columns)
        const competitionCell = cellMatches[1];
        const competitionId = extractCompetitionId(competitionCell);
        const competition = getCellText(competitionCell);

        const appearances = parseSafe(getCellText(cellMatches[2]));
        const goals = parseSafe(getCellText(cellMatches[3]));
        const assists = parseSafe(getCellText(cellMatches[4]));
        const ownGoals = parseSafe(getCellText(cellMatches[5]));
        const subbedOn = parseSafe(getCellText(cellMatches[6]));
        const subbedOff = parseSafe(getCellText(cellMatches[7]));
        const yellowCards = parseSafe(getCellText(cellMatches[8]));
        const yellowRedCards = parseSafe(getCellText(cellMatches[9]));
        const redCards = parseSafe(getCellText(cellMatches[10]));
        const penaltyGoals = parseSafe(getCellText(cellMatches[11]));
        const avgMinutesPerGoal = parseSafe(getCellText(cellMatches[12]));
        const minutesPlayed = parseSafe(getCellText(cellMatches[13]));

        stats.push({
          competition,
          competitionId,
          appearances,
          goals,
          assists,
          ownGoals,
          subbedOn,
          subbedOff,
          yellowCards,
          yellowRedCards,
          redCards,
          penaltyGoals,
          avgMinutesPerGoal,
          minutesPlayed,
        });
      }
    }

    console.log(`       ✅ Found ${stats.length} competition records`);

    // Extract totals from tfoot
    let totals = null;
    const tfoot = table.match(/<tfoot>([\s\S]*?)<\/tfoot>/);
    if (tfoot) {
      const tfootRowMatches =
        tfoot[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
      if (tfootRowMatches.length > 0) {
        const totalRow = tfootRowMatches[0];
        if (totalRow) {
          const totalCells = totalRow.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];

          if (isGoalkeeper && totalCells.length >= 13) {
            // Same column layout as season stats
            const appearances = parseSafe(getCellText(totalCells[2]));
            const goals = parseSafe(getCellText(totalCells[3]));
            const own_goals = parseSafe(getCellText(totalCells[4]));
            const subbed_on = parseSafe(getCellText(totalCells[5]));
            const subbed_off = parseSafe(getCellText(totalCells[6]));
            const yellow_cards = parseSafe(getCellText(totalCells[7]));
            const yellow_red_cards = parseSafe(getCellText(totalCells[8]));
            const red_cards = parseSafe(getCellText(totalCells[9]));
            const goals_conceded = parseSafe(getCellText(totalCells[10]));
            const clean_sheets = parseSafe(getCellText(totalCells[11]));
            const minutes_played = parseSafe(getCellText(totalCells[12]));
            const avg_minutes_per_match =
              appearances > 0 ? Math.round(minutes_played / appearances) : 0;

            totals = {
              appearances,
              goals,
              own_goals,
              subbed_on,
              subbed_off,
              yellow_cards,
              yellow_red_cards,
              red_cards,
              goals_conceded,
              clean_sheets,
              minutes_played,
              avg_minutes_per_match,
            };
          } else if (!isGoalkeeper && totalCells.length >= 14) {
            const appearances = parseSafe(getCellText(totalCells[2]));
            const goals = parseSafe(getCellText(totalCells[3]));
            const assists = parseSafe(getCellText(totalCells[4]));
            const own_goals = parseSafe(getCellText(totalCells[5]));
            const subbed_on = parseSafe(getCellText(totalCells[6]));
            const subbed_off = parseSafe(getCellText(totalCells[7]));
            const yellow_cards = parseSafe(getCellText(totalCells[8]));
            const yellow_red_cards = parseSafe(getCellText(totalCells[9]));
            const red_cards = parseSafe(getCellText(totalCells[10]));
            const penalties = parseSafe(getCellText(totalCells[11]));
            const avg_minutes_per_goal = parseSafe(getCellText(totalCells[12]));
            const minutes_played = parseSafe(getCellText(totalCells[13]));
            const avg_minutes_per_match =
              appearances > 0 ? Math.round(minutes_played / appearances) : 0;

            totals = {
              appearances,
              goals,
              assists,
              own_goals,
              subbed_on,
              subbed_off,
              yellow_cards,
              yellow_red_cards,
              red_cards,
              penalties,
              avg_minutes_per_goal,
              minutes_played,
              avg_minutes_per_match,
            };
          }
        }
      }
    }

    return { stats, totals, isGoalkeeper };
  } catch (error) {
    console.log(`       ❌ Error fetching player stats: ${error}`);
    return { stats: [], totals: null, isGoalkeeper: false };
  }
}

/**
 * Save player stats and totals to database
 */
export async function savePlayerStats(
  playerId: number,
  stats: PlayerStats[],
  totals: any,
): Promise<void> {
  try {
    // Save career totals as JSON
    if (totals) {
      const stmt = db.prepare(
        `UPDATE players SET total_stats = ? WHERE id = ?`,
      );
      stmt.run(JSON.stringify(totals), playerId);
      console.log(`       💾 Saved totals for player ${playerId}`);
    }

    // Save per-competition stats
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO player_stats (
        player_id, competition_id, appearances, goals,
        assists, own_goals, subbed_on, subbed_off, yellow_cards,
        yellow_red_cards, red_cards, penalties,
        minutes_played, average_minutes_per_match
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const stat of stats) {
      const isGK = "goalsConceded" in stat;
      const avgMinPerMatch =
        stat.appearances > 0
          ? Math.round(stat.minutesPlayed / stat.appearances)
          : 0;

      // Use extracted competition ID (should always be available from the URL)
      const competitionId = stat.competitionId;

      // Skip if no competition ID was extracted
      if (!competitionId) {
        console.log(
          `       ⚠️  Skipping competition with no ID: ${stat.competition}`,
        );
        continue;
      }

      // Insert competition if it doesn't exist
      try {
        const compStmt = db.prepare(
          `INSERT OR IGNORE INTO competitions (id, name) VALUES (?, ?)`,
        );
        compStmt.run(competitionId, stat.competition);
      } catch {
        // Competition already exists, ignore
      }

      insertStmt.run(
        playerId,
        competitionId,
        stat.appearances,
        isGK ? null : (stat as FieldPlayerStats).goals,
        isGK ? null : (stat as FieldPlayerStats).assists,
        stat.ownGoals,
        stat.subbedOn,
        stat.subbedOff,
        stat.yellowCards,
        stat.yellowRedCards,
        stat.redCards,
        isGK ? null : (stat as FieldPlayerStats).penaltyGoals,
        stat.minutesPlayed,
        avgMinPerMatch,
      );
    }

    console.log(
      `       ✅ Saved ${stats.length} competition records for player ${playerId}`,
    );
  } catch (error) {
    console.log(`       ❌ Error saving player stats: ${error}`);
  }
}

/**
 * Fetch and save player stats in one call
 */
export async function fetchAndSavePlayerStats(
  playerId: number,
  profileUrl: string,
): Promise<boolean> {
  console.log(`   📊 Scraping player stats...`);
  const { stats, totals, isGoalkeeper } = await fetchPlayerStats(
    profileUrl,
    playerId,
  );

  if (stats.length === 0) {
    console.log(`       ℹ️  No stats found`);
    return false;
  }

  await savePlayerStats(playerId, stats, totals);
  return true;
}
