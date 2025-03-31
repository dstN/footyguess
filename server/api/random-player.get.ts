// server/api/random-player.get.ts
import sqlite3 from "sqlite3";
import { randomInt } from "crypto";
import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const db = new sqlite3.Database("server/db/players.db");

  // Alle Spieler laden
  const players = await new Promise<{ id: string }[]>((resolve, reject) => {
    db.all(`SELECT id FROM players`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as { id: string }[]);
    });
  });

  // Zufallsspieler ziehen
  const randomPlayerId = (players as { id: string }[])[
    randomInt((players as { id: string }[]).length)
  ].id;

  // Spielerinfos laden
  const player = await new Promise<{
    id: string;
    name: string;
    birthdate: string | null;
    birthplace: string | null;
    nationality: string | null;
    position: string | null;
    shirt_number: string | null;
    foot: string | null;
    active: number | null;
    deathdate: string | null;
  }>((resolve, reject) => {
    db.get(
      `SELECT * FROM players WHERE id = ?`,
      [randomPlayerId],
      (err, row) => {
        if (err) reject(err);
        else
          resolve(
            row as {
              id: string;
              name: string;
              birthdate: string | null;
              birthplace: string | null;
              nationality: string | null;
              position: string | null;
              shirt_number: string | null;
              foot: string | null;
              active: number | null;
              deathdate: string | null;
            }
          );
      }
    );
  });

  // Karriereverlauf laden
  const career = await new Promise<
    { start_year: number | null; end_year: number | null; club: string }[]
  >((resolve, reject) => {
    db.all(
      `SELECT start_year, end_year, club FROM career WHERE player_id = ? ORDER BY start_year ASC`,
      [randomPlayerId],
      (err, rows) => {
        if (err) reject(err);
        else
          resolve(
            rows as {
              start_year: number | null;
              end_year: number | null;
              club: string;
            }[]
          );
      }
    );
  });

  db.close();

  return {
    id: player.id,
    name: player.name,
    birthdate: player.birthdate,
    birthplace: player.birthplace,
    nationality: player.nationality,
    position: player.position,
    shirt_number: player.shirt_number,
    foot: player.foot,
    active: player.active,
    deathdate: player.deathdate,
    career,
  };
});
