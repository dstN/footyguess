import { createError, defineEventHandler, getQuery, sendError } from "h3";
import db from "../db/connection";
import type { Player } from "~/types/player";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const hardMode = query.mode === "hard";

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
        HAVING SUM(ps.appearances) >= 50
      )
    `;

  const base = db
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

  if (!base) {
    return sendError(
      event,
      createError({ statusCode: 404, statusMessage: "No player found" }),
    );
  }

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

  const transfers = db
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

  const stats = db
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
    .all(base.id);

  return {
    ...base,
    transfers,
    stats,
  };
});
