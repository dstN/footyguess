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
      total_worth INTEGER,
      shirt_number INTEGER,
      main_position TEXT,
      secondary_positions TEXT, -- JSON-Array
      birthplace TEXT,
      nationalities TEXT,       -- JSON-Array
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
      upcoming INTEGER,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (from_club_id) REFERENCES clubs(id),
      FOREIGN KEY (to_club_id) REFERENCES clubs(id),
      UNIQUE (player_id, transfer_date)
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      logo_path TEXT
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      player_id INTEGER NOT NULL,
      competition_id TEXT NOT NULL,
      appearances INTEGER,
      goals INTEGER,
      assists INTEGER,
      own_goals INTEGER,
      subbed_on INTEGER,
      subbed_off INTEGER,
      yellow_cards INTEGER,
      yellow_red_cards INTEGER,
      red_cards INTEGER,
      penalties INTEGER,
      minutes_played INTEGER,
      average_minutes_per_match INTEGER,
      UNIQUE (player_id, competition_id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (competition_id) REFERENCES competitions(id)
    );
  `);
}
