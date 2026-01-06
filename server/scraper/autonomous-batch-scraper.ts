/**
 * Complete Autonomous Batch Scraper with Differential Updates
 *
 * For each player:
 * 1. Fetch API data, update only changed fields + extract tm_url from relativeUrl
 * 2. Fetch transfers, compare with DB, add only new ones
 * 3. Fetch clubs, add only missing ones
 * 4. Fetch stats, replace all with fresh data
 * 5. Set last_scraped_at timestamp
 */

import fs from "fs";
import path from "path";
import db from "../db/connection.ts";
import { fetchPlayerDetails } from "./extract-player-data.ts";
import { fetchPlayerStats, savePlayerStats } from "./extract-player-stats.ts";

const BASE_URL = "https://tmapi-alpha.transfermarkt.technology/";

// Set up error logging
const LOG_DIR = path.resolve("server/scraper/logs");
const LOG_FILE = path.join(
  LOG_DIR,
  `scraper-${new Date().toISOString().split("T")[0]}.log`,
);

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logError(
  context: string,
  playerName: string,
  tmId: number,
  error: any,
) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : "";
  const logEntry = `[${timestamp}] [${context}] Player: ${playerName} (tm_id: ${tmId})\nError: ${errorMsg}\n${errorStack ? "Stack: " + errorStack : ""}\n\n`;

  fs.appendFileSync(LOG_FILE, logEntry);
}

interface Transfer {
  id: string;
  transferSource: { clubId: string; countryId: number };
  transferDestination: { clubId: string; countryId: number };
  details: {
    date: string;
    seasonId: number;
    isPending: boolean;
    marketValue: { value: number };
    fee: { value: number | null; text?: string };
    season: {
      id: number;
      display: string;
    };
  };
  typeDetails: {
    type: string;
    name: string;
    feeDescription: string;
  };
  relativeUrl: string;
}

interface ClubData {
  id: string;
  name: string;
}

function cleanClubName(name: string): string {
  return name.replace(/\s*\(-?\s*\d{4}\)\s*$/, "").trim();
}

/**
 * Fetch transfer history from API
 */
async function fetchTransferHistory(tmId: number): Promise<Transfer[]> {
  try {
    const response = await fetch(`${BASE_URL}transfer/history/player/${tmId}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.status === 429) {
      console.log(`     ⏳ Rate limited, waiting 5 seconds...`);
      await new Promise((r) => setTimeout(r, 5000));
      return fetchTransferHistory(tmId);
    }

    if (!response.ok) {
      return [];
    }

    const data: any = await response.json();
    return data.data?.history?.terminated || [];
  } catch (error) {
    console.log(`     ⚠️  Error fetching transfers: ${error}`);
    return [];
  }
}

/**
 * Fetch club details from API
 */
async function fetchClubDetails(
  clubIds: string[],
): Promise<Map<string, ClubData>> {
  if (clubIds.length === 0) return new Map();

  try {
    const BATCH_SIZE = 100;
    const clubMap = new Map<string, ClubData>();

    for (let i = 0; i < clubIds.length; i += BATCH_SIZE) {
      const batch = clubIds.slice(i, i + BATCH_SIZE);
      const params = batch.map((id) => `ids[]=${id}`).join("&");
      const url = `${BASE_URL}clubs?${params}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en-US",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) continue;

      const data: any = await response.json();
      if (data.data?.length) {
        data.data.forEach((club: any) => {
          clubMap.set(club.id, {
            id: club.id,
            name: cleanClubName(club.name),
          });
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    return clubMap;
  } catch (error) {
    console.log(`     ⚠️  Error fetching clubs: ${error}`);
    return new Map();
  }
}

/**
 * Get existing transfers from database for a player
 */
function getExistingTransfers(
  playerId: number,
): Map<string, { id: number; fee: number }> {
  const existing = db
    .prepare(
      `
    SELECT id, transfer_key
    FROM transfers
    WHERE player_id = ?
  `,
    )
    .all(playerId) as any[];

  const map = new Map<string, { id: number; fee: number }>();
  existing.forEach((t) => {
    map.set(t.transfer_key, { id: t.id, fee: 0 });
  });
  return map;
}

/**
 * Check if a club exists in database
 */
function clubExists(clubId: string): boolean {
  const result = db
    .prepare(`SELECT id FROM clubs WHERE id = ? LIMIT 1`)
    .get(parseInt(clubId));
  return !!result;
}

/**
 * Add a club to database (with default name if not found)
 */
function addClub(clubId: string, clubName: string): void {
  try {
    const parsedId = parseInt(clubId);
    // Always try to insert, using provided name or fallback
    db.prepare(`INSERT OR IGNORE INTO clubs (id, name) VALUES (?, ?)`).run(
      parsedId,
      clubName || `Club ${clubId}`,
    );
  } catch (error) {
    // Silently ignore - club might already exist
  }
}

/**
 * Fetch a single club from API by ID
 */
async function fetchClubFromAPI(clubId: string): Promise<ClubData | null> {
  try {
    const url = `${BASE_URL}clubs?ids[]=${clubId}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchClubFromAPI(clubId);
    }

    if (!response.ok) return null;

    const data: any = await response.json();
    if (data.data?.length > 0) {
      const club = data.data[0];
      return {
        id: club.id,
        name: cleanClubName(club.name),
      };
    }
  } catch {
    // Error fetching - will use placeholder
  }
  return null;
}

/**
 * Ensure a club exists before referencing it in transfers (fetches from API if needed)
 */
async function ensureClubExists(clubId: string): Promise<void> {
  try {
    const parsedId = parseInt(clubId);
    const exists = db
      .prepare(`SELECT id FROM clubs WHERE id = ? LIMIT 1`)
      .get(parsedId);

    if (!exists) {
      // Try to fetch club from API
      const clubData = await fetchClubFromAPI(clubId);

      if (clubData) {
        // Insert real club data
        db.prepare(`INSERT INTO clubs (id, name) VALUES (?, ?)`).run(
          parsedId,
          clubData.name,
        );
      } else {
        // Fallback to placeholder if API doesn't have it
        db.prepare(`INSERT INTO clubs (id, name) VALUES (?, ?)`).run(
          parsedId,
          `Club ${clubId}`,
        );
      }
    }
  } catch {
    // Already exists or other error
  }
}

/**
 * Add a transfer to database
 */
async function addTransfer(
  playerId: number,
  playerName: string,
  tmId: number,
  transfer: Transfer,
  clubMap: Map<string, ClubData>,
): Promise<void> {
  const fromClub = transfer.transferSource?.clubId;
  const toClub = transfer.transferDestination?.clubId;
  const fromClubName = clubMap.get(fromClub)?.name || `Club ${fromClub}`;
  const toClubName = clubMap.get(toClub)?.name || `Club ${toClub}`;

  // Ensure both clubs exist before creating transfer
  if (fromClub) {
    addClub(fromClub, fromClubName);
    await ensureClubExists(fromClub);
  }
  if (toClub) {
    addClub(toClub, toClubName);
    await ensureClubExists(toClub);
  }

  const transferDate = transfer.details?.date
    ? transfer.details.date.split("T")[0]
    : null;

  // Use season display format (e.g., "23/24") instead of just the year
  const season = transfer.details?.season?.display || null;

  // Fee handling: null for free transfers, otherwise use the value
  const fee =
    transfer.details?.fee?.value !== null &&
    transfer.details?.fee?.value !== undefined
      ? Math.round(transfer.details.fee.value)
      : 0;

  // Extract transfer type
  const transferType = transfer.typeDetails?.type || null;

  // Check if transfer is upcoming
  const upcoming = transfer.details?.isPending ? 1 : 0;

  // Create transfer key for deduplication (use transfer ID from API)
  const transferKey = transfer.id;

  try {
    db.prepare(
      `
      INSERT OR IGNORE INTO transfers 
      (player_id, season, transfer_date, from_club_id, to_club_id, fee, transfer_type, upcoming, transfer_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      playerId,
      season,
      transferDate,
      fromClub ? parseInt(fromClub) : null,
      toClub ? parseInt(toClub) : null,
      fee,
      transferType,
      upcoming,
      transferKey,
    );
  } catch (error) {
    logError("addTransfer", playerName, tmId, error);
  }
}

/**
 * Update player fields if different
 */
async function updatePlayerFields(
  tmId: number,
  apiData: any,
): Promise<{ updated: boolean; changes: string[] }> {
  const dbPlayer = db
    .prepare(`SELECT * FROM players WHERE tm_id = ?`)
    .get(tmId) as any;

  if (!dbPlayer) {
    return { updated: false, changes: [] };
  }

  const changes: string[] = [];
  const updates: { [key: string]: any } = {};

  // Extract tm_url from relativeUrl
  const newTmUrl = `https://www.transfermarkt.com${apiData.relativeUrl}`;
  if (dbPlayer.tm_url !== newTmUrl) {
    updates.tm_url = newTmUrl;
    changes.push("tm_url");
  }

  // Check position
  const newPosition = apiData.attributes?.position?.name || "Unknown";
  if (dbPlayer.main_position !== newPosition) {
    updates.main_position = newPosition;
    changes.push("main_position");
  }

  // Check secondary positions
  const secondaryPositions: string[] = [];
  if (
    apiData.attributes?.firstSidePosition?.name &&
    apiData.attributes.firstSidePosition.name !== newPosition
  ) {
    secondaryPositions.push(apiData.attributes.firstSidePosition.name);
  }
  if (
    apiData.attributes?.secondSidePosition?.name &&
    apiData.attributes.secondSidePosition.name !== newPosition &&
    apiData.attributes.secondSidePosition.name !==
      apiData.attributes.firstSidePosition?.name
  ) {
    secondaryPositions.push(apiData.attributes.secondSidePosition.name);
  }
  const newSecondaryPositions =
    secondaryPositions.length > 0 ? secondaryPositions.join(", ") : null;
  if (dbPlayer.secondary_positions !== newSecondaryPositions) {
    updates.secondary_positions = newSecondaryPositions;
    changes.push("secondary_positions");
  }

  // Check birthplace
  const newBirthplace = apiData.birthPlaceDetails?.placeOfBirth || null;
  if (dbPlayer.birthplace !== newBirthplace) {
    updates.birthplace = newBirthplace;
    changes.push("birthplace");
  }

  // Check height
  const newHeight = apiData.attributes?.height
    ? Math.round(apiData.attributes.height * 100)
    : null;
  if (dbPlayer.height_cm !== newHeight) {
    updates.height_cm = newHeight;
    changes.push("height_cm");
  }

  // Check foot
  const newFoot = apiData.attributes?.preferredFoot?.name || null;
  if (dbPlayer.foot !== newFoot) {
    updates.foot = newFoot;
    changes.push("foot");
  }

  // Check nationalities
  const newNationalities = apiData.nationalityDetails?.nationalities
    ? [
        apiData.nationalityDetails.nationalities.nationalityId,
        apiData.nationalityDetails.nationalities.secondNationalityId,
      ]
        .filter((n) => n && n !== 0)
        .join(",")
    : null;
  if (dbPlayer.nationalities_ids !== newNationalities) {
    updates.nationalities_ids = newNationalities;
    changes.push("nationalities_ids");
  }

  // Check birthdate
  const newBirthdate = apiData.lifeDates?.dateOfBirth || null;
  if (dbPlayer.birthdate !== newBirthdate) {
    updates.birthdate = newBirthdate;
    changes.push("birthdate");
  }

  // Check market value
  const newMarketValue = apiData.marketValueDetails?.current?.value || 0;
  if (dbPlayer.total_worth !== newMarketValue) {
    updates.total_worth = newMarketValue;
    changes.push("total_worth");
  }

  // Check names
  const normalizeSearch = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['']/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  if (dbPlayer.tm_short_name !== apiData.shortName) {
    updates.tm_short_name = apiData.shortName;
    updates.tm_short_name_search = normalizeSearch(apiData.shortName);
    changes.push("tm_short_name");
  }

  if (dbPlayer.tm_artist_name !== apiData.artistName) {
    updates.tm_artist_name = apiData.artistName;
    updates.tm_artist_name_search = normalizeSearch(apiData.artistName);
    changes.push("tm_artist_name");
  }

  // Full name: passportName || displayName
  const newFullName =
    apiData.nationalityDetails?.passportName || apiData.displayName || null;
  if (dbPlayer.tm_full_name !== newFullName) {
    updates.tm_full_name = newFullName;
    updates.tm_full_name_search = normalizeSearch(newFullName || "");
    changes.push("tm_full_name");
  }

  // Check current_club_id and shirt_number from clubAssignments
  const currentAssignment = apiData.clubAssignments?.find(
    (a: any) => a.type === "current",
  );
  const isRetired =
    currentAssignment?.clubId === "123" || currentAssignment?.clubId === 123;

  let newCurrentClubId: number | null = null;
  let newShirtNumber: number | null = null;
  let newRetiredSince: string | null = null;
  const newActive = isRetired ? 0 : 1;

  if (isRetired) {
    // Player is retired - club ID is 123, start date is retirement date
    newRetiredSince = currentAssignment?.start || null;
  } else {
    // Player is active
    newCurrentClubId = currentAssignment?.clubId
      ? parseInt(currentAssignment.clubId)
      : null;
    newShirtNumber = currentAssignment?.shirtNumber || null;

    // Ensure the club exists before setting it
    if (newCurrentClubId) {
      await ensureClubExists(String(newCurrentClubId));
    }
  }

  if (dbPlayer.current_club_id !== newCurrentClubId) {
    updates.current_club_id = newCurrentClubId;
    changes.push("current_club_id");
  }

  if (dbPlayer.shirt_number !== newShirtNumber) {
    updates.shirt_number = newShirtNumber;
    changes.push("shirt_number");
  }

  if (dbPlayer.retired_since !== newRetiredSince) {
    updates.retired_since = newRetiredSince;
    changes.push("retired_since");
  }

  if (dbPlayer.active !== newActive) {
    updates.active = newActive;
    changes.push("active");
  }

  // If there are changes, update
  if (changes.length > 0) {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    values.push(tmId);

    db.prepare(`UPDATE players SET ${setClause} WHERE tm_id = ?`).run(
      ...values,
    );
    return { updated: true, changes };
  }

  return { updated: false, changes: [] };
}

/**
 * Update stats (delete old, insert new)
 */
async function updatePlayerStats(
  playerId: number,
  tmUrl: string,
): Promise<number> {
  try {
    // Get latest tm_url from database (may have been just updated)
    const player = db
      .prepare(`SELECT tm_url FROM players WHERE id = ?`)
      .get(playerId) as any;
    const currentTmUrl = player?.tm_url || tmUrl;

    // Delete existing stats for this player
    db.prepare(`DELETE FROM player_stats WHERE player_id = ?`).run(playerId);

    // Fetch new stats
    const { stats, totals } = await fetchPlayerStats(currentTmUrl, playerId);

    if (stats.length === 0) {
      return 0;
    }

    // Save new stats
    await savePlayerStats(playerId, stats, totals);

    return stats.length;
  } catch (error) {
    console.log(`     ⚠️  Error updating stats: ${error}`);
    return 0;
  }
}

/**
 * Process a single player completely
 */
async function processPlayer(
  playerId: number,
  name: string,
  tmId: number,
  tmUrl: string,
): Promise<void> {
  console.log(`\n👤 ${name}`);

  // 1. Fetch and update player details
  console.log(`   📥 Updating player details...`);
  try {
    const playerData = await fetchPlayerDetails(tmId);
    if (playerData) {
      const { updated, changes } = await updatePlayerFields(tmId, playerData);
      if (updated) {
        console.log(`     ✅ Updated: ${changes.join(", ")}`);
      } else {
        console.log(`     ℹ️  No changes`);
      }
    } else {
      console.log(`     ⚠️  Could not fetch player data`);
    }
  } catch (error) {
    console.log(`     ❌ Error: ${error}`);
    logError("updatePlayerFields", name, tmId, error);
    return; // Stop processing this player
  }

  // 2. Fetch and update transfers
  console.log(`   🔄 Updating transfers...`);
  const apiTransfers = await fetchTransferHistory(tmId);
  const existingTransfers = getExistingTransfers(playerId);

  if (apiTransfers.length > 0) {
    // Collect club IDs
    const clubIds = new Set<string>();
    apiTransfers.forEach((t) => {
      if (t.transferSource?.clubId) clubIds.add(t.transferSource.clubId);
      if (t.transferDestination?.clubId)
        clubIds.add(t.transferDestination.clubId);
    });

    // Fetch club details
    const clubMap = await fetchClubDetails(Array.from(clubIds));

    // Add new transfers
    let newCount = 0;
    for (const transfer of apiTransfers) {
      const key = transfer.id;
      if (!existingTransfers.has(key)) {
        await addTransfer(playerId, name, tmId, transfer, clubMap);
        newCount++;
      }
    }

    if (newCount > 0) {
      console.log(`     ✅ Added ${newCount} new transfers`);
    } else {
      console.log(`     ℹ️  No new transfers`);
    }
  } else {
    console.log(`     ℹ️  No transfers found`);
  }

  // 3. Update stats (complete replacement)
  console.log(`   📊 Updating statistics...`);
  const statsCount = await updatePlayerStats(playerId, tmUrl);
  if (statsCount > 0) {
    console.log(`     ✅ Updated ${statsCount} competition records`);
  } else {
    console.log(`     ℹ️  No stats available`);
  }

  // 4. Set last_scraped_at timestamp
  db.prepare(`UPDATE players SET last_scraped_at = ? WHERE id = ?`).run(
    Math.floor(Date.now() / 1000),
    playerId,
  );

  console.log(`   ⏱️  Timestamp set`);
  await new Promise((r) => setTimeout(r, 1000)); // Rate limiting
}

/**
 * Main autonomous batch processor
 */
async function main() {
  console.log("🚀 AUTONOMOUS BATCH SCRAPER WITH DIFFERENTIAL UPDATES\n");

  const players = db
    .prepare(
      `
    SELECT id, name, tm_id, tm_url
    FROM players
    WHERE tm_id IS NOT NULL
  `,
    )
    .all() as any[];

  console.log(`📊 Processing ${players.length} players\n`);
  console.log(`${"=".repeat(80)}\n`);

  let processed = 0;
  let errors = 0;

  for (const player of players) {
    try {
      await processPlayer(player.id, player.name, player.tm_id, player.tm_url);
      processed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      logError("processPlayer", player.name, player.tm_id, error);
      errors++;
    }
  }

  console.log(`\n${"=".repeat(80)}\n`);
  console.log(`📈 SUMMARY:`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏱️  Timestamp: ${new Date().toISOString()}\n`);
}

await main();
