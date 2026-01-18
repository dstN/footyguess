/**
 * Player Service
 * Handles player retrieval, search, and random selection
 */

import db from "../db/connection.ts";
import type { Player, Transfer, PlayerStats } from "~/types/player";
import { parsePlayerData } from "../utils/player-parser.ts";
import {
  computeDifficulty,
  INTL_WEIGHTS,
  INTL_HARD_THRESHOLD,
  TOP5_HARD_THRESHOLD,
  TOP5_LEAGUES,
  type Difficulty,
} from "../utils/difficulty.ts";

export interface PlayerWithDetails extends Player {
  transfers: Transfer[];
  stats: PlayerStats[];
  difficulty: Difficulty;
}

/**
 * Get player by ID with all related data
 */
export function getPlayerById(id: number): PlayerWithDetails | null {
  const player = db
    .prepare(
      `SELECT p.*, c.name AS currentClub
       FROM players p
       LEFT JOIN clubs c ON p.current_club_id = c.id
       WHERE p.id = ?`,
    )
    .get(id) as Player | undefined;

  if (!player) return null;

  return enrichPlayer(player);
}

/**
 * Get player by name with all related data
 */
export function getPlayerByName(name: string): PlayerWithDetails | null {
  const player = db
    .prepare(
      `SELECT p.*, c.name AS currentClub
       FROM players p
       LEFT JOIN clubs c ON p.current_club_id = c.id
       WHERE p.name = ?`,
    )
    .get(name) as Player | undefined;

  if (!player) return null;

  return enrichPlayer(player);
}

/**
 * Search players by name with fuzzy matching
 */
export function searchPlayers(query: string, limit: number = 10): string[] {
  const normalized = normalizeSearch(query);
  if (normalized.length < 2) return [];

  const patternStart = `${normalized}%`;
  const patternWord = `% ${normalized}%`;
  const patternHyphen = `%-${normalized}%`;

  const rows = db
    .prepare(
      `SELECT name, tm_full_name FROM players
       WHERE name_search LIKE ? ESCAPE '\\'
          OR name_search LIKE ? ESCAPE '\\'
          OR name_search LIKE ? ESCAPE '\\'
          OR tm_short_name_search LIKE ? ESCAPE '\\'
          OR tm_short_name_search LIKE ? ESCAPE '\\'
          OR tm_short_name_search LIKE ? ESCAPE '\\'
          OR tm_full_name_search LIKE ? ESCAPE '\\'
          OR tm_full_name_search LIKE ? ESCAPE '\\'
          OR tm_full_name_search LIKE ? ESCAPE '\\'
       ORDER BY name ASC
       LIMIT ?`,
    )
    .all(
      patternStart,
      patternWord,
      patternHyphen,
      patternStart,
      patternWord,
      patternHyphen,
      patternStart,
      patternWord,
      patternHyphen,
      limit,
    ) as { name: string; tm_full_name: string | null }[];

  // Identify duplicate names in the result set
  const nameCounts = new Map<string, number>();
  for (const r of rows) {
    nameCounts.set(r.name, (nameCounts.get(r.name) || 0) + 1);
  }

  return rows.map((r) => {
    // If this name appears multiple times, append the full name for disambiguation
    if ((nameCounts.get(r.name) || 0) > 1 && r.tm_full_name) {
      if (r.name !== r.tm_full_name) {
        return `${r.name} (${r.tm_full_name})`;
      }
    }
    return r.name;
  });
}

/**
 * Options for getting a random player
 */
interface GetRandomPlayerOptions {
  /**
   * Filter by specific difficulty tier
   * If provided, only returns players matching this tier
   */
  tierFilter?: Difficulty["tier"];
  /**
   * Player IDs to exclude from selection
   * Used to prevent duplicate players within the same session
   */
  excludePlayerIds?: number[];
}

/**
 * Get a random player, optionally filtered by difficulty tier
 *
 * @param options - Configuration options
 * @param options.tierFilter - Optional tier to filter by (easy/medium/hard/ultra)
 * @param options.excludePlayerIds - Optional array of player IDs to exclude
 * @returns Player with full details, or null if none found
 *
 * @example
 * // Get any player (excluding ultra by default)
 * getRandomPlayer()
 *
 * // Get only hard difficulty players
 * getRandomPlayer({ tierFilter: 'hard' })
 *
 * // Exclude already-played players
 * getRandomPlayer({ excludePlayerIds: [1, 2, 3] })
 */
export function getRandomPlayer(
  options: GetRandomPlayerOptions = {},
): PlayerWithDetails | null {
  const { excludePlayerIds = [] } = options;
  let { tierFilter } = options;

  // If no specific tier requested (default mode), randomly pick one with equal probability
  // This ensures 33/33/33 distribution instead of skewing towards the most common tier (Hard)
  if (!tierFilter) {
    const tiers: Difficulty["tier"][] = ["easy", "medium", "hard"];
    tierFilter = tiers[Math.floor(Math.random() * tiers.length)];
  }

  const intlCases = Object.entries(INTL_WEIGHTS)
    .map(([id, weight]) => `WHEN '${id}' THEN ps.appearances * ${weight}`)
    .join(" ");
  const intlSum = `SUM(CASE c.id ${intlCases} ELSE 0 END)`;
  const top5Ids = TOP5_LEAGUES.map((id) => `'${id}'`).join(", ");
  const top5Sum = `SUM(CASE WHEN c.id IN (${top5Ids}) THEN ps.appearances ELSE 0 END)`;

  // Build filter clause based on tier filter
  // We use specific thresholds to optimize the SQL search space for each tier
  let filterClause: string;

  if (tierFilter === "ultra") {
    // Ultra: players that don't meet hard thresholds
    filterClause = `WHERE p.id NOT IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        GROUP BY ps.player_id
        HAVING ${intlSum} >= ${INTL_HARD_THRESHOLD}
           OR ${top5Sum} >= ${TOP5_HARD_THRESHOLD}
      )`;
  } else if (tierFilter === "easy") {
    // Easy optimization: strict high thresholds
    // > 80 Intl OR > 400 Top5
    filterClause = `WHERE p.id IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        GROUP BY ps.player_id
        HAVING ${intlSum} > 80
           OR ${top5Sum} > 400
      )`;
  } else if (tierFilter === "medium") {
    // Medium optimization: medium thresholds
    // >= 60 Intl OR >= 200 Top5 (captures Easy too, but excludes Hard/Ultra)
    filterClause = `WHERE p.id IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        GROUP BY ps.player_id
        HAVING ${intlSum} >= 60
           OR ${top5Sum} >= 200
      )`;
  } else {
    // Hard (or backup): standard thresholds
    // >= 45 Intl OR >= 100 Top5 (captures Easy/Medium too)
    filterClause = `WHERE p.id IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        GROUP BY ps.player_id
        HAVING ${intlSum} >= ${INTL_HARD_THRESHOLD}
           OR ${top5Sum} >= ${TOP5_HARD_THRESHOLD}
      )`;
  }

  // Add exclusion for already-played players
  const exclusionClause =
    excludePlayerIds.length > 0
      ? ` AND p.id NOT IN (${excludePlayerIds.join(",")})`
      : "";
  filterClause += exclusionClause;

  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM players p ${filterClause}`)
    .get() as { count: number } | undefined;
  const totalCount = countRow?.count ?? 0;

  if (totalCount <= 0) return null;

  // Increase attempts finding specific tiers
  const maxAttempts = 15;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const offset = Math.floor(Math.random() * totalCount);
    const player = db
      .prepare(
        `SELECT p.*, c.name AS currentClub
         FROM players p
         LEFT JOIN clubs c ON p.current_club_id = c.id
         ${filterClause}
         LIMIT 1 OFFSET ?`,
      )
      .get(offset) as Player | undefined;

    if (!player) {
      attempts++;
      continue;
    }

    try {
      const enriched = enrichPlayer(player);

      // Verify exact tier match (SQL is approximate/inclusive)
      // Since we force-set tierFilter above, this will always check against our random choice
      if (enriched.difficulty.tier === tierFilter) {
        return enriched;
      }
    } catch {
      // Invalid player data, try another
    }

    attempts++;
  }

  return null;
}
// --- Internal helpers ---

function enrichPlayer(player: Player): PlayerWithDetails {
  const parsed = parsePlayerData(player);

  // Resolution: Always prefer IDs (Source of Truth) over legacy column
  if (player.nationalities_ids) {
    const ids = player.nationalities_ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length > 0) {
      // Use placeholders for WHERE IN clause
      const placeholders = ids.map(() => "?").join(",");
      const nations = db
        .prepare(`SELECT name FROM nationalities WHERE id IN (${placeholders})`)
        .all(...ids) as { name: string }[];

      if (nations.length > 0) {
        parsed.nationalities = nations.map((n) => n.name);
      }
    }
  }

  const transfers = db
    .prepare(
      `SELECT t.season, t.transfer_date, t.fee, t.transfer_type, t.upcoming,
              fc.id AS from_club_id, fc.name AS from_club,
              tc.id AS to_club_id, tc.name AS to_club
       FROM transfers t
       LEFT JOIN clubs fc ON t.from_club_id = fc.id
       LEFT JOIN clubs tc ON t.to_club_id = tc.id
       WHERE t.player_id = ?
         AND (fc.name IS NULL OR fc.name NOT REGEXP 'U\\d{1,2}|Yth\\.|Jgd\\.')
         AND (tc.name IS NULL OR tc.name NOT REGEXP 'U\\d{1,2}|Yth\\.|Jgd\\.')
       ORDER BY t.transfer_date DESC`,
    )
    .all(player.id) as Transfer[];

  const stats = db
    .prepare(
      `SELECT ps.appearances, ps.goals, ps.assists, ps.own_goals,
              ps.subbed_on, ps.subbed_off, ps.yellow_cards, ps.yellow_red_cards,
              ps.red_cards, ps.penalties, ps.minutes_played, ps.average_minutes_per_match,
              c.id AS competition_id, c.name AS competition
       FROM player_stats ps
       JOIN competitions c ON ps.competition_id = c.id
       WHERE ps.player_id = ?
       ORDER BY ps.appearances DESC`,
    )
    .all(player.id) as PlayerStats[];

  // Parse clean sheets from total_stats if goalkeeper
  let cleanSheets: number | undefined;
  if (player.main_position?.includes("Goalkeeper") && player.total_stats) {
    try {
      const totalStats = JSON.parse(player.total_stats);
      if (totalStats.clean_sheets !== undefined) {
        cleanSheets = Number(totalStats.clean_sheets) || 0;
      }
    } catch {
      // Ignore parse errors
    }
  }

  const difficulty = computeDifficulty(stats as any, {
    isGoalkeeper: player.main_position?.includes("Goalkeeper"),
    cleanSheets,
  });

  return {
    ...parsed,
    transfers,
    stats,
    difficulty,
  };
}

function normalizeSearch(value: string): string {
  return escapeLikeWildcards(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['']/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase(),
  );
}

function escapeLikeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
