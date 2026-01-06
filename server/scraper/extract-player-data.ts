/**
 * Modular player data extraction from TransferMarkt API
 * These functions extract player info from API responses and save to database
 */

import db from "../db/connection.ts";

const BASE_URL = "https://tmapi-alpha.transfermarkt.technology/";

interface PlayerAPIData {
  id: string;
  name: string;
  shortName: string;
  artistName: string;
  displayName: string;
  attributes: {
    height?: number;
    positionId: number;
    positionGroup: string;
    position: {
      id: number;
      name: string;
      shortName: string;
      category: string;
    };
    firstSidePosition?: {
      id: number;
      name: string;
      shortName: string;
      category: string;
    };
    secondSidePosition?: {
      id: number;
      name: string;
      shortName: string;
      category: string;
    };
    preferredFoot?: {
      id: number;
      name: string;
    };
  };
  birthPlaceDetails: {
    countryOfBirthId: number;
    placeOfBirth: string;
  };
  lifeDates: {
    dateOfBirth: string;
    age: number;
  };
  nationalityDetails?: {
    nationalities: {
      nationalityId: number;
      secondNationalityId?: number;
    };
    passportName?: string;
  };
  marketValueDetails?: {
    current?: {
      value: number;
    };
    highest?: {
      value: number;
    };
  };
  clubAssignments?: Array<{
    type: string;
    clubId?: string | number;
    shirtNumber?: number | null;
    start?: string;
  }>;
}

/**
 * Fetch player details from the API
 */
export async function fetchPlayerDetails(
  tmId: number,
  retries = 3,
): Promise<PlayerAPIData | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${BASE_URL}player/${tmId}`, {
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
        continue;
      }

      if (!response.ok) {
        console.log(
          `     ⚠️  HTTP ${response.status} - Player data not available`,
        );
        return null;
      }

      const data: any = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      if (i === retries - 1) {
        console.log(`     ⚠️  Error fetching player data: ${error}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

/**
 * Extract and save player details to database
 */
export async function savePlayerDetails(
  tmId: number,
  playerData: PlayerAPIData,
): Promise<void> {
  try {
    const position = playerData.attributes?.position?.name || "Unknown";
    const height = playerData.attributes?.height
      ? Math.round(playerData.attributes.height * 100)
      : null;
    const preferredFoot = playerData.attributes?.preferredFoot?.name || null;

    // Extract secondary positions from firstSidePosition and secondSidePosition
    const secondaryPositions: string[] = [];
    if (
      playerData.attributes?.firstSidePosition?.name &&
      playerData.attributes.firstSidePosition.name !== position
    ) {
      secondaryPositions.push(playerData.attributes.firstSidePosition.name);
    }
    if (
      playerData.attributes?.secondSidePosition?.name &&
      playerData.attributes.secondSidePosition.name !== position &&
      playerData.attributes.secondSidePosition.name !==
        playerData.attributes.firstSidePosition?.name
    ) {
      secondaryPositions.push(playerData.attributes.secondSidePosition.name);
    }
    const secondaryPositionsStr =
      secondaryPositions.length > 0 ? secondaryPositions.join(", ") : null;

    // Get birthplace
    const birthplace = playerData.birthPlaceDetails?.placeOfBirth || null;

    // Extract club assignments, handling retired status
    const currentAssignment = playerData.clubAssignments?.find(
      (a: any) => a.type === "current",
    );
    const isRetired =
      currentAssignment?.clubId === "123" || currentAssignment?.clubId === 123;

    let currentClubId: number | null = null;
    let shirtNumber: number | null = null;
    let retiredSince: string | null = null;
    const active = isRetired ? 0 : 1;

    if (isRetired) {
      // Player is retired - club ID is 123, start date is retirement date
      retiredSince = currentAssignment?.start || null;
      // current_club_id remains null for retired players
    } else {
      // Player is active
      currentClubId = currentAssignment?.clubId
        ? parseInt(String(currentAssignment.clubId))
        : null;
      shirtNumber = currentAssignment?.shirtNumber || null;
    }

    // Full name: passportName || displayName
    const fullName =
      playerData.nationalityDetails?.passportName ||
      playerData.displayName ||
      null;

    // Handle nationalities as array (primary + secondary)
    const nationalities = playerData.nationalityDetails?.nationalities
      ? [
          playerData.nationalityDetails.nationalities.nationalityId,
          playerData.nationalityDetails.nationalities.secondNationalityId,
        ]
          .filter((n) => n && n !== 0)
          .join(",")
      : null;

    const dateOfBirth = playerData.lifeDates?.dateOfBirth || null;
    const currentMarketValue =
      playerData.marketValueDetails?.current?.value || 0;

    // Create search fields using the same normalization as searchPlayers.ts
    const normalizeSearch = (value: string) => {
      return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['']/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    };

    const stmt = db.prepare(`
      UPDATE players 
      SET 
        main_position = ?,
        secondary_positions = ?,
        birthplace = ?,
        height_cm = ?,
        foot = ?,
        nationalities_ids = ?,
        birthdate = ?,
        total_worth = ?,
        name_search = ?,
        tm_short_name = ?,
        tm_short_name_search = ?,
        tm_artist_name = ?,
        tm_artist_name_search = ?,
        tm_full_name = ?,
        tm_full_name_search = ?,
        current_club_id = ?,
        shirt_number = ?,
        retired_since = ?,
        active = ?,
        last_scraped_at = ?
      WHERE tm_id = ?
    `);

    stmt.run(
      position,
      secondaryPositions,
      birthplace,
      height,
      preferredFoot,
      nationalities,
      dateOfBirth,
      currentMarketValue,
      normalizeSearch(playerData.name),
      playerData.shortName,
      normalizeSearch(playerData.shortName),
      playerData.artistName,
      normalizeSearch(playerData.artistName),
      fullName,
      normalizeSearch(fullName || ""),
      currentClubId,
      shirtNumber,
      retiredSince,
      active,
      Math.floor(Date.now() / 1000),
      tmId,
    );

    console.log(`     ✅ Saved player details (${position})`);
  } catch (error) {
    console.log(`     ❌ Error saving player details: ${error}`);
  }
}

/**
 * Fetch and save player details in one go
 */
export async function fetchAndSavePlayerDetails(
  tmId: number,
): Promise<boolean> {
  console.log(`   📥 Fetching player details...`);
  const playerData = await fetchPlayerDetails(tmId);

  if (!playerData) {
    console.log(`     ℹ️  No player data available`);
    return false;
  }

  await savePlayerDetails(tmId, playerData);
  return true;
}
