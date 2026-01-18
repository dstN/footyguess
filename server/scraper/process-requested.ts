import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { fetchAndSavePlayerDetails } from "./extract-player-data.ts";
import { fetchPlayerStats, savePlayerStats } from "./extract-player-stats.ts";

const BASE_URL = "https://tmapi-alpha.transfermarkt.technology/";

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

interface RichClubData {
  id: string;
  name: string;
  tmUrl: string;
  leagueId: string;
}

function cleanClubName(name: string): string {
  return name.replace(/\s*\(-?\s*\d{4}\)\s*$/, "").trim();
}

// Reuse logic from autonomous-batch-scraper
async function fetchClubFromAPI(clubId: string): Promise<RichClubData | null> {
  try {
    const url = `${BASE_URL}club/${clubId}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
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
    if (data.success && data.data) {
      const club = data.data;
      return {
        id: String(club.id),
        name: cleanClubName(club.name),
        tmUrl: club.relativeUrl || "",
        leagueId: club.baseDetails?.primaryCompetitionId || "",
      };
    }
  } catch {}
  return null;
}

async function ensureClubExists(clubId: string): Promise<void> {
  try {
    const parsedId = parseInt(clubId);
    const existing = db
      .prepare(`SELECT id, tm_id FROM clubs WHERE id = ?`)
      .get(parsedId) as any;
    if (existing && existing.tm_id) return;

    const clubData = await fetchClubFromAPI(clubId);
    if (clubData) {
      db.prepare(
        `
        INSERT INTO clubs (id, name, tm_id, tm_url, league_id)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          tm_id = excluded.tm_id,
          tm_url = excluded.tm_url,
          league_id = COALESCE(excluded.league_id, clubs.league_id)
      `,
      ).run(
        parsedId,
        clubData.name,
        parseInt(clubData.id),
        clubData.tmUrl,
        clubData.leagueId,
      );
    } else if (!existing) {
      db.prepare(`INSERT INTO clubs (id, name) VALUES (?, ?)`).run(
        parsedId,
        `Club ${clubId}`,
      );
    }
  } catch {}
}

async function fetchTransferHistory(tmId: number): Promise<Transfer[]> {
  try {
    const response = await fetch(`${BASE_URL}transfer/history/player/${tmId}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return [];
    const data: any = await response.json();
    return data.data?.history?.terminated || [];
  } catch {
    return [];
  }
}

async function processTransfers(
  playerId: number,
  tmId: number,
  clubMap: Map<string, any>,
) {
  const transfers = await fetchTransferHistory(tmId);
  const existingTransfers = new Set(
    (
      db
        .prepare(`SELECT transfer_key FROM transfers WHERE player_id = ?`)
        .all(playerId) as any[]
    ).map((t) => t.transfer_key),
  );

  for (const transfer of transfers) {
    if (existingTransfers.has(transfer.id)) continue;

    const fromClub = transfer.transferSource?.clubId;
    const toClub = transfer.transferDestination?.clubId;

    if (fromClub) await ensureClubExists(fromClub);
    if (toClub) await ensureClubExists(toClub);

    try {
      const transferDate = transfer.details?.date
        ? transfer.details.date.split("T")[0]
        : null;
      const season = transfer.details?.season?.display || null;
      const fee =
        transfer.details?.fee?.value !== null &&
        transfer.details?.fee?.value !== undefined
          ? Math.round(transfer.details.fee.value)
          : 0;
      const transferType = transfer.typeDetails?.type || null;
      const upcoming = transfer.details?.isPending ? 1 : 0;

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
        transfer.id,
      );
    } catch (e) {
      console.error(`Error saving transfer: ${e}`);
    }
  }
}

async function processRequestedPlayer(req: { id: number; url: string }) {
  console.log(`\nProcessing request ${req.id}: ${req.url}`);

  // Extract TM ID
  // Supports: /profil/spieler/123 or just id
  let tmId: number | null = null;
  const match = req.url.match(/spieler\/(\d+)/) || req.url.match(/\/(\d+)$/);
  if (match) tmId = parseInt(match[1]);

  if (!tmId) {
    console.error("Could not parse TM ID");
    db.prepare(
      `UPDATE requested_players SET status = 'failed', error = 'Invalid URL' WHERE id = ?`,
    ).run(req.id);
    return;
  }

  try {
    db.prepare(
      `UPDATE requested_players SET status = 'processing' WHERE id = ?`,
    ).run(req.id);

    console.log(`   Fetched TM ID: ${tmId}`);

    // 1. Fetch & Save Details (creates player in DB)
    await fetchAndSavePlayerDetails(tmId);

    // Get DB ID
    const player = db
      .prepare(`SELECT id, tm_url FROM players WHERE tm_id = ?`)
      .get(tmId) as any;
    if (!player) throw new Error("Failed to save player");

    // 2. Transfers
    console.log(`   Processing transfers...`);
    await processTransfers(player.id, tmId, new Map());

    // 3. Stats
    console.log(`   Processing stats...`);
    const { stats, totals } = await fetchPlayerStats(
      player.tm_url || req.url,
      player.id,
    );
    if (stats.length > 0) {
      db.prepare(`DELETE FROM player_stats WHERE player_id = ?`).run(player.id);
      await savePlayerStats(player.id, stats, totals);
    }

    // Done
    db.prepare(
      `UPDATE requested_players SET status = 'done', player_id = ?, updated_at = strftime('%s','now') WHERE id = ?`,
    ).run(player.id, req.id);

    console.log(`   ✅ Success!`);
  } catch (e: any) {
    console.error(`   ❌ Failed: ${e.message}`);
    db.prepare(
      `UPDATE requested_players SET status = 'failed', error = ?, updated_at = strftime('%s','now') WHERE id = ?`,
    ).run(e.message, req.id);
  }
}

async function run() {
  initSchema();
  const pending = db
    .prepare(`SELECT id, url FROM requested_players WHERE status != 'done'`)
    .all() as any[];

  if (pending.length === 0) {
    console.log("No pending requests.");
    return;
  }

  console.log(`Found ${pending.length} pending requests.`);
  for (const req of pending) {
    await processRequestedPlayer(req);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

run();
