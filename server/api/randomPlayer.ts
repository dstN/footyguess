import { createError, defineEventHandler, getQuery, sendError } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection.ts";
import type { Player, Transfer, PlayerStats } from "~/types/player";
import {
  computeDifficulty,
  INTL_WEIGHTS,
  INTL_HARD_THRESHOLD,
  TOP5_HARD_THRESHOLD,
  TOP5_LEAGUES,
} from "../utils/difficulty";
import { createRoundToken, generateSessionId } from "../utils/tokens";
import { parseSchema } from "../utils/validate";
import { object, optional, picklist, string, maxLength, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const parsed = parseSchema(
    object({
      mode: optional(picklist(["hard", "normal"])),
      sessionId: optional(pipe(string(), maxLength(128))),
    }),
    query,
  );
  if (!parsed.ok) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "Invalid query" }),
    );
  }

  const hardMode = parsed.data.mode === "hard";
  const sessionFromQuery = parsed.data.sessionId ?? null;
  const sessionId = sessionFromQuery || generateSessionId();

  const intlCases = Object.entries(INTL_WEIGHTS)
    .map(([id, weight]) => `WHEN '${id}' THEN ps.appearances * ${weight}`)
    .join(" ");
  const intlSum = `SUM(CASE c.id ${intlCases} ELSE 0 END)`;
  const top5Ids = TOP5_LEAGUES.map((id) => `'${id}'`).join(", ");
  const top5Sum = `SUM(CASE WHEN c.id IN (${top5Ids}) THEN ps.appearances ELSE 0 END)`;

  const filterClause = hardMode
    ? ""
    : `
      WHERE p.id IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        GROUP BY ps.player_id
        HAVING ${intlSum} >= ${INTL_HARD_THRESHOLD}
          OR ${top5Sum} >= ${TOP5_HARD_THRESHOLD}
      )
    `;

  // Get count once outside loop
  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM players p ${filterClause}`)
    .get() as { count: number } | undefined;
  const totalCount = countRow?.count ?? 0;

  function getRandomPlayer() {
    if (totalCount <= 0) return undefined;
    const offset = Math.floor(Math.random() * totalCount);

    return db
      .prepare(
        `
        SELECT
          p.*,
          c.name AS currentClub
        FROM players p
        LEFT JOIN clubs c ON p.current_club_id = c.id
        ${filterClause}
        LIMIT 1 OFFSET ?
      `,
      )
      .get(offset) as Player | undefined;
  }

  let base: Player | undefined;
  let transfers: Transfer[] = [];
  let stats: PlayerStats[] = [];
  let difficulty;
  let attempts = 0;

  while (attempts < 5) {
    base = getRandomPlayer();

    if (!base) break;

    try {
      if (typeof base.secondary_positions === "string") {
        base.secondary_positions = JSON.parse(base.secondary_positions);
      }
      if (typeof base.nationalities === "string") {
        base.nationalities = JSON.parse(base.nationalities);
      }
      if (typeof base.total_stats === "string") {
        base.total_stats = JSON.parse(base.total_stats);
      }
    } catch (error) {
      logError(`Invalid JSON for player ${base.id}`, error);
      attempts += 1;
      continue;
    }

    transfers = db
      .prepare(
        `
      SELECT
        t.season,
        t.transfer_date,
        t.fee,
        t.transfer_type,
        t.upcoming,
        fc.id AS from_club_id,
        fc.name AS from_club,
        tc.id AS to_club_id,
        tc.name AS to_club
      FROM transfers t
      LEFT JOIN clubs fc ON t.from_club_id = fc.id
      LEFT JOIN clubs tc ON t.to_club_id = tc.id
      WHERE
        t.player_id = ?
        AND (
          fc.name IS NULL OR fc.name NOT REGEXP 'U\\d{1,2}|Yth\\.|Jgd\\.'
        )
        AND (
          tc.name IS NULL OR tc.name NOT REGEXP 'U\\d{1,2}|Yth\\.|Jgd\\.'
        )
      ORDER BY t.transfer_date DESC
    `,
      )
      .all(base.id) as Transfer[];

    stats = db
      .prepare(
        `
        SELECT
          ps.appearances,
          ps.goals,
          ps.assists,
          ps.own_goals,
          ps.subbed_on,
          ps.subbed_off,
          ps.yellow_cards,
          ps.yellow_red_cards,
          ps.red_cards,
          ps.penalties,
          ps.minutes_played,
          ps.average_minutes_per_match,
          c.id AS competition_id,
          c.name AS competition
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        WHERE ps.player_id = ?
        ORDER BY ps.appearances DESC
      `,
      )
      .all(base.id) as PlayerStats[];

    difficulty = computeDifficulty(stats, { forceUltra: hardMode });

    if (hardMode || difficulty.tier !== "ultra") {
      break;
    }
    attempts += 1;
  }

  if (!base || (!hardMode && difficulty?.tier === "ultra")) {
    return sendError(
      event,
      createError({ statusCode: 404, statusMessage: "No player found" }),
    );
  }

  db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(sessionId);

  const roundId = randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutes
  db.prepare(
    `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at, max_clues_allowed) VALUES (?, ?, ?, 0, ?, ?, 10)`,
  ).run(
    roundId,
    base.id,
    sessionId,
    Math.floor(Date.now() / 1000),
    Math.floor(expiresAt / 1000),
  );

  const token = createRoundToken({
    roundId,
    playerId: base.id,
    sessionId,
    exp: expiresAt,
  });

  return {
    ...base,
    transfers,
    stats,
    difficulty,
    round: {
      id: roundId,
      token,
      sessionId,
      expiresAt,
      cluesUsed: 0,
    },
  };
});
