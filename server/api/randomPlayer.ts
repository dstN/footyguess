import { createError, defineEventHandler, getQuery, sendError } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection";
import type { Player } from "~/types/player";
import { computeDifficulty } from "../utils/difficulty";
import { createRoundToken, generateSessionId } from "../utils/tokens";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const hardMode = query.mode === "hard";
  const sessionFromQuery =
    typeof query.sessionId === "string" && query.sessionId.length > 0
      ? query.sessionId
      : null;
  const sessionId = sessionFromQuery || generateSessionId();

  const filterClause = hardMode
    ? ""
    : `
      WHERE p.id IN (
        SELECT ps.player_id
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        WHERE
          c.name LIKE '%Champions League%'
          OR c.name LIKE '%Europa League%'
          OR c.name LIKE '%UEFA Cup%'
          OR c.id IN ('CL', 'EL', 'UEL', 'UEFA')
        GROUP BY ps.player_id
        HAVING SUM(ps.appearances) >= 25
      )
    `;

  let base: Player | undefined;
  let transfers: any[] = [];
  let stats: Array<{ competition_id: string; appearances: number }> = [];
  let difficulty;
  let attempts = 0;

  while (attempts < 5) {
    base = db
      .prepare(
        `
        SELECT
          p.*,
          c.name AS currentClub,
          c.logo_path AS clubLogo
        FROM players p
        LEFT JOIN clubs c ON p.current_club_id = c.id
        ${filterClause}
        ORDER BY RANDOM()
        LIMIT 1
      `,
      )
      .get() as Player | undefined;

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
    } catch {
      // ignore parse errors
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
        fc.logo_path AS from_club_logo,
        tc.id AS to_club_id,
        tc.name AS to_club,
        tc.logo_path AS to_club_logo
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
      .all(base.id);

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
          c.name AS competition,
          c.logo_path AS competition_logo
        FROM player_stats ps
        JOIN competitions c ON ps.competition_id = c.id
        WHERE ps.player_id = ?
        ORDER BY ps.appearances DESC
      `,
      )
      .all(base.id) as Array<{ competition_id: string; appearances: number }>;

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

  db.prepare(
    `INSERT OR IGNORE INTO sessions (id) VALUES (?)`,
  ).run(sessionId);

  const roundId = randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutes
  db.prepare(
    `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at) VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(roundId, base.id, sessionId, Math.floor(Date.now() / 1000), Math.floor(expiresAt / 1000));

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
