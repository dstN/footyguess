import { createError, defineEventHandler, getQuery, sendError } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection";
import type { Player } from "~/types/player";
import { computeDifficulty } from "../utils/difficulty";
import { createRoundToken, generateSessionId } from "../utils/tokens";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { name } = query;
  const sessionFromQuery =
    typeof query.sessionId === "string" && query.sessionId.length > 0
      ? (query.sessionId as string)
      : null;
  const sessionId = sessionFromQuery || generateSessionId();
  if (!name || typeof name !== "string") {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "Missing player name" }),
    );
  }

  const player = db
    .prepare(
      `
      SELECT
        p.*,
        c.name AS currentClub
      FROM players p
      LEFT JOIN clubs c ON p.current_club_id = c.id
      WHERE p.name = ?
    `,
    )
    .get(name) as Player | undefined;

  if (!player) {
    return sendError(
      event,
      createError({ statusCode: 404, statusMessage: "Player not found" }),
    );
  }

  try {
    if (typeof player.secondary_positions === "string") {
      player.secondary_positions = JSON.parse(player.secondary_positions);
    }
    if (typeof player.nationalities === "string") {
      player.nationalities = JSON.parse(player.nationalities);
    }
    if (typeof player.total_stats === "string") {
      player.total_stats = JSON.parse(player.total_stats);
    }
  } catch {
    // ignore JSON parse error
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
    .all(player.id);

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
        c.name AS competition
      FROM player_stats ps
      JOIN competitions c ON ps.competition_id = c.id
      WHERE ps.player_id = ?
      ORDER BY ps.appearances DESC
    `,
    )
    .all(player.id) as Array<{ competition_id: string; appearances: number }>;

  const difficulty = computeDifficulty(stats);
  db.prepare(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`).run(sessionId);

  const roundId = randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 30;
  db.prepare(
    `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at) VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(roundId, player.id, sessionId, Math.floor(Date.now() / 1000), Math.floor(expiresAt / 1000));

  const token = createRoundToken({
    roundId,
    playerId: player.id,
    sessionId,
    exp: expiresAt,
  });

  return {
    ...player,
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
