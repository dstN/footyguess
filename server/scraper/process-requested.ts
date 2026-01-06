import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { logError } from "../utils/logger.ts";

const BASE_URL = "https://tmapi-alpha.transfermarkt.technology/";

interface Transfer {
  id: string;
  transferSource: { clubId: string; countryId: number };
  transferDestination: { clubId: string; countryId: number };
  details: {
    date: string;
    seasonId: number;
    marketValue: { value: number };
    fee: { value: number; text: string };
    age: number;
    contractUntilDate: string;
  };
  typeDetails: { type: string; name: string; feeDescription: string };
}

function cleanClubName(name: string): string {
  return name.replace(/\s*\(-?\s*\d{4}\)\s*$/, "").trim();
}

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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: any = await response.json();
    return data.data?.history?.terminated || [];
  } catch (error) {
    throw error;
  }
}

async function fetchClubDetails(clubIds: string[]): Promise<Map<string, any>> {
  if (clubIds.length === 0) return new Map();

  try {
    const BATCH_SIZE = 100;
    const clubMap = new Map<string, any>();

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
            baseDetails: club.baseDetails,
          });
        });
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    return clubMap;
  } catch (error) {
    console.error("Error fetching club details:", error);
    return new Map();
  }
}

function getTmId(url: string) {
  const match = url.match(/spieler\/(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

(async () => {
  initSchema();

  const pending = db
    .prepare(
      `SELECT id, url FROM requested_players WHERE status = 'pending' ORDER BY id ASC`,
    )
    .all() as Array<{ id: number; url: string }>;

  if (!pending.length) {
    console.log("No pending player requests.");
    return;
  }

  for (const req of pending) {
    db.prepare(
      `UPDATE requested_players SET status = 'processing', updated_at = strftime('%s','now') WHERE id = ?`,
    ).run(req.id);

    try {
      const tmId = getTmId(req.url);
      if (!tmId) {
        throw new Error("Could not extract TM ID from URL");
      }

      const player = db
        .prepare(`SELECT id FROM players WHERE tm_id = ?`)
        .get(tmId) as { id: number } | undefined;

      if (player) {
        const hasTransfers = db
          .prepare(`SELECT 1 FROM transfers WHERE player_id = ? LIMIT 1`)
          .get(player.id);

        if (!hasTransfers) {
          const transfers = await fetchTransferHistory(tmId);
          if (transfers.length > 0) {
            const clubIds = new Set<string>();
            transfers.forEach((t) => {
              if (t.transferSource?.clubId)
                clubIds.add(t.transferSource.clubId);
              if (t.transferDestination?.clubId)
                clubIds.add(t.transferDestination.clubId);
            });

            const clubMap = await fetchClubDetails(Array.from(clubIds));
            const stmt = db.prepare(
              `INSERT OR IGNORE INTO transfers
              (player_id, season, transfer_date, from_club_id, to_club_id, fee, transfer_type, transfer_key)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            );

            for (const transfer of transfers) {
              const fromClubId = transfer.transferSource?.clubId;
              const toClubId = transfer.transferDestination?.clubId;
              const date = new Date(transfer.details?.date)
                .toISOString()
                .split("T")[0];
              const season =
                transfer.details?.seasonId?.toString() || "Unknown";
              const feeValue = transfer.details?.fee?.value;
              const fee =
                feeValue !== null && feeValue !== undefined
                  ? Math.floor(feeValue)
                  : null;
              const type = transfer.typeDetails?.name || "Transfer";
              const key = `${fromClubId}-${toClubId}-${date}`;

              if (fromClubId) {
                const clubData = clubMap.get(fromClubId);
                const name = clubData?.name || `Club ${fromClubId}`;
                db.prepare(
                  `INSERT OR IGNORE INTO clubs (id, name) VALUES (?, ?)`,
                ).run(parseInt(fromClubId), name);
              }
              if (toClubId) {
                const clubData = clubMap.get(toClubId);
                const name = clubData?.name || `Club ${toClubId}`;
                db.prepare(
                  `INSERT OR IGNORE INTO clubs (id, name) VALUES (?, ?)`,
                ).run(parseInt(toClubId), name);
              }

              stmt.run(
                player.id,
                season,
                date,
                fromClubId ? parseInt(fromClubId) : null,
                toClubId ? parseInt(toClubId) : null,
                fee,
                type,
                key,
              );
            }
          }
        }

        db.prepare(
          `UPDATE requested_players SET status = 'done', player_id = ?, updated_at = strftime('%s','now') WHERE id = ?`,
        ).run(player.id, req.id);
      } else {
        throw new Error(`Player with TM ID ${tmId} not found in database`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      db.prepare(
        `UPDATE requested_players SET status = 'failed', error = ?, updated_at = strftime('%s','now') WHERE id = ?`,
      ).run(errorMsg, req.id);
      logError("Requested player scrape failed", error as Error, {
        requestId: req.id,
        url: req.url,
      });
    }
  }
})();
