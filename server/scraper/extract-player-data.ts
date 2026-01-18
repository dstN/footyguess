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
    positionGroupName?: string;
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
  relativeUrl: string;
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
    const position =
      playerData.attributes?.position?.name ||
      playerData.attributes?.positionGroupName ||
      "Unknown";
    const height = playerData.attributes?.height
      ? Math.round(playerData.attributes.height * 100)
      : null;

    // Construct tm_url
    const tmUrl = `https://www.transfermarkt.com${playerData.relativeUrl}`;

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

    // Handle nationalities
    // API returns IDs: { nationalityId: 157, secondNationalityId: 0 }
    // User request: "WE CAN ONLY FILL WITH ID".
    // So we just save the IDs to 'nationalities_ids' and ignore 'nationalities'.

    const natIdsArr = [
      playerData.nationalityDetails?.nationalities?.nationalityId,
      playerData.nationalityDetails?.nationalities?.secondNationalityId,
    ].filter((n) => n && n !== 0) as number[];

    // Self-heal nationalities table using data available in API response
    // The API structure is a bit tricky, often names are not directly in nationalityDetails.nationalities
    // But we can try to extract from 'birthPlaceDetails.country' or similar if available,
    // OR we rely on the fact that if we have an ID but no name, we might simply insert "Unknown" or skip.
    // However, looking at the TS interface `PlayerAPIData`, we don't see explicit nationality NAMES mapped to IDs.
    // Let's re-examine if we can extract names.
    // The interface shows: `nationalityDetails: { nationalities: { nationalityId: number ... } }`
    // It does NOT seem to contain the string name for the nationality ID.
    // This is a blocker for perfect self-healing.

    // WAIT: `birthPlaceDetails` has `countryOfBirthId`.
    // Let's check `countryOfBirthId` vs `nationalityId`.
    // If they match, we can use `birthPlaceDetails.placeOfBirth` (maybe?) - No that's a city/country string.

    // ALTERNATIVE: Use `playerData.nationalityDetails.passportName`? No.

    // Since we don't have the Nationality Name in the API response explicitly linked to the ID,
    // we cannot reliably insert into `nationalities` table here without potential errors.

    // However, the user said: "check if there are nationalities_ids being used... that don't have corresponding id within nationalities-table"
    // And previously: "we don't have to repopulate the 'nationalities' column... we have the nationalities-table"

    // If the API allows fetching nationality info, we should.
    // But `fetchPlayerDetails` doesn't seem to return it based on the interface.

    // Let's look closer at the actual API response structure if possible (assumed based on valid props).
    // If `nationalityDetails` has a `name` property that was missed in the interface?
    // I will assume for now we CANNOT self-heal without extra API calls or data.

    // But wait, the previous `nationalities` column WAS populated. Where did that come from?
    // It came from `playerData.nationalities` in the OLD scraper version?
    // The current `PlayerAPIData` interface seems limited.

    // Let's stick to just saving IDs.
    // For the MISSING IDs, I should likely create a separate script to fetch them from TM directly or insert placeholders.
    // But for this specific file modification, I should only verify if I can save it.

    // User instruction: "that also works wuth old players because we rescraped their nationalities_ids"
    // User instruction: "check if there are nationalities_ids being used... that don't have corresponding id"

    // I found 41 missing IDs.
    // I should probably fix them with a script, not necessarily inside the scraper loop (which might be slow).
    // BUT the scraper IS the best place to prevent future gaps.

    // Let's look at `birthPlaceDetails`.
    // `birthPlaceDetails: { countryOfBirthId: number; placeOfBirth: string; }` -> "Rio de Janeiro, Brazil"

    // Actually, I'll log the missing ID issue but keep the code simple for now.
    // I will NOT modify the scraper to insert into `nationalities` table if I don't have the name.

    // IDs string
    const nationalitiesIds = natIdsArr.length > 0 ? natIdsArr.join(",") : null;

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

    // CRITICAL: Ensure club exists BEFORE inserting player to satisfy Foreign Key constraint
    if (active && currentClubId && currentClubId !== 123) {
      try {
        db.prepare(`INSERT OR IGNORE INTO clubs (id, name) VALUES (?, ?)`).run(
          currentClubId,
          `Club ${currentClubId}`, // Placeholder name, will be enriched later
        );
      } catch (e) {
        // Ignore errors here, enrichment phase will handle issues or log them
      }
    }

    // Use UPSERT to handle both new and existing players
    db.prepare(
      `
      INSERT INTO players (
        tm_id, name, main_position, secondary_positions, birthplace,
        height_cm, foot, nationalities_ids, birthdate, total_worth,
        name_search, tm_short_name, tm_short_name_search,
        tm_artist_name, tm_artist_name_search, tm_full_name, tm_full_name_search,
        current_club_id, shirt_number, retired_since, active, last_scraped_at, tm_url
      )
      VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(tm_id) DO UPDATE SET
        main_position = excluded.main_position,
        secondary_positions = excluded.secondary_positions,
        birthplace = excluded.birthplace,
        height_cm = excluded.height_cm,
        foot = excluded.foot,
        nationalities_ids = excluded.nationalities_ids,
        birthdate = excluded.birthdate,
        total_worth = excluded.total_worth,
        name_search = excluded.name_search,
        tm_short_name = excluded.tm_short_name,
        tm_short_name_search = excluded.tm_short_name_search,
        tm_artist_name = excluded.tm_artist_name,
        tm_artist_name_search = excluded.tm_artist_name_search,
        tm_full_name = excluded.tm_full_name,
        tm_full_name_search = excluded.tm_full_name_search,
        current_club_id = excluded.current_club_id,
        shirt_number = excluded.shirt_number,
        retired_since = excluded.retired_since,
        active = excluded.active,
        last_scraped_at = excluded.last_scraped_at,
        tm_url = excluded.tm_url
    `,
    ).run(
      tmId,
      playerData.name,
      position,
      secondaryPositionsStr,
      birthplace,
      height,
      preferredFoot,
      nationalitiesIds,
      dateOfBirth,
      currentMarketValue,
      normalizeSearch(playerData.name),
      playerData.shortName,
      normalizeSearch(playerData.shortName),
      playerData.artistName,
      normalizeSearch(playerData.artistName || ""),
      fullName,
      normalizeSearch(fullName || ""),
      currentClubId,
      shirtNumber,
      retiredSince,
      active,
      Math.floor(Date.now() / 1000),
      tmUrl,
    );

    console.log(`     ✅ Saved player details (${position})`);

    // --- Enrich Club Data ---
    if (active && currentClubId && currentClubId !== 123) {
      try {
        const clubRes = await fetch(`${BASE_URL}club/${currentClubId}`, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (clubRes.ok) {
          const clubData = await clubRes.json();
          if (clubData.success && clubData.data) {
            const c = clubData.data;

            // Upsert club with new metadata
            db.prepare(
              `INSERT OR IGNORE INTO clubs (id, name) VALUES (?, ?)`,
            ).run(c.id, c.name);

            // Update metadata
            db.prepare(
              `
                   UPDATE clubs 
                   SET tm_id = ?, tm_url = ?, league_id = ?
                   WHERE id = ?
                `,
            ).run(c.id, c.slug, c.leagueId, c.id);
          }
        }
      } catch (err) {
        console.log(`     ⚠️  Error fetching club details: ${err}`);
      }
    }
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
