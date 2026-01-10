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
      `SELECT name FROM players
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
    ) as { name: string }[];

  return rows.map((r) => r.name);
}

/**
 * Get a random player, optionally filtered by difficulty
 */
export function getRandomPlayer(
  hardMode: boolean = false,
): PlayerWithDetails | null {
  const intlCases = Object.entries(INTL_WEIGHTS)
    .map(([id, weight]) => `WHEN '${id}' THEN ps.appearances * ${weight}`)
    .join(" ");
  const intlSum = `SUM(CASE c.id ${intlCases} ELSE 0 END)`;
  const top5Ids = TOP5_LEAGUES.map((id) => `'${id}'`).join(", ");
  const top5Sum = `SUM(CASE WHEN c.id IN (${top5Ids}) THEN ps.appearances ELSE 0 END)`;

  const filterClause = hardMode
    ? ""
    : `WHERE p.id IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        GROUP BY ps.player_id
        HAVING ${intlSum} >= ${INTL_HARD_THRESHOLD}
           OR ${top5Sum} >= ${TOP5_HARD_THRESHOLD}
      )`;

  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM players p ${filterClause}`)
    .get() as { count: number } | undefined;
  const totalCount = countRow?.count ?? 0;

  if (totalCount <= 0) return null;

  let attempts = 0;
  while (attempts < 5) {
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
      if (hardMode || enriched.difficulty.tier !== "ultra") {
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

  const difficulty = computeDifficulty(stats as any);

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
