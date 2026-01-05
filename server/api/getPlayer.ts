import { createError, defineEventHandler, getQuery, sendError } from "h3";
import { randomUUID } from "node:crypto";
import db from "../db/connection.ts";
import type { Player } from "~/types/player";
import { computeDifficulty } from "../utils/difficulty.ts";
import { createRoundToken, generateSessionId } from "../utils/tokens.ts";
import { parseSchema } from "../utils/validate.ts";
import { parsePlayerData } from "../utils/player-parser.ts";
import { logError } from "../utils/logger.ts";
import { successResponse, errorResponse } from "../utils/response.ts";
import { object, string, minLength, maxLength, optional, pipe } from "valibot";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const parsed = parseSchema(
      object({
        name: pipe(string(), minLength(1), maxLength(128)),
        sessionId: optional(pipe(string(), maxLength(128))),
      }),
      query,
    );
    if (!parsed.ok) {
      return errorResponse(
        400,
        "Invalid query parameters",
        event,
        { received: query },
      );
    }

    const name = parsed.data.name;
    const sessionFromQuery = parsed.data.sessionId ?? null;
    const sessionId = sessionFromQuery || generateSessionId();

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
      return errorResponse(
        404,
        `Player "${name}" not found`,
        event,
      );
    }

    try {
      parsePlayerData(player as any);
    } catch {
      // Silently continue if JSON parsing fails
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
      `INSERT INTO rounds (id, player_id, session_id, clues_used, started_at, expires_at, max_clues_allowed) VALUES (?, ?, ?, 0, ?, ?, 10)`,
    ).run(
      roundId,
      player.id,
      sessionId,
      Math.floor(Date.now() / 1000),
      Math.floor(expiresAt / 1000),
    );

    const token = createRoundToken({
      roundId,
      playerId: player.id,
      sessionId,
      exp: expiresAt,
    });

    return successResponse(
      {
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
      },
      event,
    );
  } catch (error) {
    logError("getPlayer error", error);
    return errorResponse(
      500,
      "Failed to load player",
      event,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );
  }
});
