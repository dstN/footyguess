// server/utils/setup-db-init.ts
import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

const dbPath = path.resolve("server/db/players.db");
const jsonPath = path.resolve("query.json");

interface PlayerRaw {
  spieler: { value: string };
  spielerLabel: { value: string };
  vereinLabel: { value: string };
  matches: { value: string };
  startdatum?: { value: string };
}

interface PlayerBase {
  id: string;
  name: string;
  team: string;
  start: string | null;
  matches: number;
}

export async function setupDatabaseInit(): Promise<void> {
  console.log("🏁 setup-db-init.ts gestartet");

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  const uniquePlayers = new Map<string, PlayerBase>();

  for (const entry of data.results.bindings as PlayerRaw[]) {
    const id = entry.spieler.value.split("/").pop()!;
    const matches = parseInt(entry.matches.value);

    if (!uniquePlayers.has(id) || matches > uniquePlayers.get(id)!.matches) {
      uniquePlayers.set(id, {
        id,
        name: entry.spielerLabel.value,
        team: entry.vereinLabel.value,
        start: entry.startdatum?.value ?? null,
        matches,
      });
    }
  }

  const players = Array.from(uniquePlayers.values());
  console.log(
    `✅ ${players.length} eindeutige Spieler mit ≥60 Matches gespeichert`
  );

  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS players`);
    db.run(`DROP TABLE IF EXISTS transfers`);
    db.run(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT,
        team TEXT,
        startdate TEXT,
        matches INTEGER,
        birthdate TEXT,
        birthplace TEXT,
        nationality TEXT,
        position TEXT,
        shirt_number TEXT,
        foot TEXT,
        active INTEGER,
        deathdate TEXT
      )
    `);

    db.run(`
      CREATE TABLE transfers (
        player_id TEXT,
        start_year INTEGER,
        end_year INTEGER,
        club TEXT,
        matches INTEGER
      )
    `);

    const stmt = db.prepare(`
      INSERT INTO players (
        id, name, team, startdate, matches,
        birthdate, birthplace, nationality, position,
        shirt_number, foot, active, deathdate
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
    `);

    for (const p of players) {
      stmt.run(p.id, p.name, p.team, p.start, p.matches);
    }

    stmt.finalize();
    console.log("💾 Spieler erfolgreich in die Datenbank eingefügt.");
  });

  db.get(
    `SELECT COUNT(*) as count FROM players`,
    (_, row: { count: number }) => {
      console.log(`📊 Anzahl Spieler in DB: ${row.count}`);
    }
  );

  db.close();
}
