import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { logError } from "../utils/logger.ts";
import {
  getNextJob,
  markJobDone,
  markJobFailed,
  markJobProcessing,
} from "./queue.ts";

const BASE_URL = "https://tmapi-alpha.transfermarkt.technology/";
const BATCH_SIZE = Number(process.env.SCRAPE_QUEUE_BATCH ?? 10);
const MAX_ATTEMPTS = Number(process.env.SCRAPE_QUEUE_MAX_ATTEMPTS ?? 3);

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

function nextBackoff(attempts: number) {
  const delay = Math.min(3600, Math.pow(2, attempts) * 60);
  return Math.floor(Date.now() / 1000) + delay;
}

(async () => {
  initSchema();

  for (let i = 0; i < BATCH_SIZE; i += 1) {
    const job = getNextJob();
    if (!job) break;

    markJobProcessing(job.id);
    if (job.type === "requested") {
      db.prepare(
        `UPDATE requested_players
         SET status = 'processing', updated_at = strftime('%s','now')
         WHERE url = ?`,
      ).run(job.target);
    }

    try {
      const tmId = getTmId(job.target);
      if (!tmId) throw new Error("Could not extract TM ID from URL");

      const player = db
        .prepare(`SELECT id FROM players WHERE tm_id = ?`)
        .get(tmId) as { id: number } | undefined;

      if (!player) throw new Error(`Player with TM ID ${tmId} not found`);

      const hasTransfers = db
        .prepare(`SELECT 1 FROM transfers WHERE player_id = ? LIMIT 1`)
        .get(player.id);

      if (!hasTransfers) {
        const transfers = await fetchTransferHistory(tmId);
        if (transfers.length > 0) {
          const clubIds = new Set<string>();
          transfers.forEach((t) => {
            if (t.transferSource?.clubId) clubIds.add(t.transferSource.clubId);
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
            const season = transfer.details?.seasonId?.toString() || "Unknown";
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

      markJobDone(job.id);

      if (job.type === "requested") {
        db.prepare(
          `UPDATE requested_players
           SET status = 'done', player_id = ?, error = NULL, updated_at = strftime('%s','now')
           WHERE url = ?`,
        ).run(player.id, job.target);
      }
    } catch (error) {
      const attempts = (job.attempts || 0) + 1;
      const retryAt = attempts >= MAX_ATTEMPTS ? null : nextBackoff(attempts);
      const errorMsg = error instanceof Error ? error.message : String(error);
      markJobFailed(job.id, errorMsg, attempts, retryAt);

      if (job.type === "requested") {
        db.prepare(
          `UPDATE requested_players
           SET status = 'failed', error = ?, updated_at = strftime('%s','now')
           WHERE url = ?`,
        ).run(errorMsg, job.target);
      }

      logError("Queue scrape failed", error as Error, {
        jobId: job.id,
        target: job.target,
      });
    }
  }
})();
