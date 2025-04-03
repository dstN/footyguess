// 📁 server/db/schema.ts
import db from "./connection";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      birthdate TEXT,
      height_cm INTEGER,
      active INTEGER,
      retired_since TEXT,
      foot TEXT,
      current_club_id INTEGER,
      FOREIGN KEY (current_club_id) REFERENCES clubs(id)
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      logo_path TEXT
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      season TEXT,
      transfer_date TEXT,
      from_club_id INTEGER,
      to_club_id INTEGER,
      fee TEXT,
      transfer_type TEXT,
      total_fee INTEGER,
      upcoming INTEGER,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (from_club_id) REFERENCES clubs(id),
      FOREIGN KEY (to_club_id) REFERENCES clubs(id)
    );
  `);
}
