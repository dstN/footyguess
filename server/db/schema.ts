import db from "./connection";

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_search TEXT,
      tm_id INTEGER,
      tm_url TEXT,
      tm_short_name TEXT,
      tm_short_name_search TEXT,
      tm_full_name TEXT,
      tm_full_name_search TEXT,
      last_scraped_at INTEGER,
      birthdate TEXT,
      height_cm INTEGER,
      active INTEGER,
      retired_since TEXT,
      foot TEXT,
      current_club_id INTEGER,
      total_worth INTEGER,
      shirt_number INTEGER,
      main_position TEXT,
      secondary_positions TEXT, 
      birthplace TEXT,
      nationalities TEXT,
      total_stats TEXT,
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
      id TEXT PRIMARY KEY UNIQUE,
      name TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      nickname TEXT,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      total_rounds INTEGER DEFAULT 0,
      last_round_score INTEGER,
      last_round_base INTEGER,
      last_round_time_score INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      player_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      clues_used INTEGER DEFAULT 0,
      started_at INTEGER DEFAULT (strftime('%s','now')),
      expires_at INTEGER,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      round_id TEXT NOT NULL,
      score INTEGER,
      correct INTEGER,
      streak INTEGER,
      time_score INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (round_id) REFERENCES rounds(id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      base_score INTEGER,
      final_score INTEGER,
      streak INTEGER,
      nickname TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS requested_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      player_id INTEGER,
      error TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);

  // lightweight migrations for added columns
  try {
    db.prepare(`ALTER TABLE scores ADD COLUMN base_score INTEGER`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE scores ADD COLUMN time_score INTEGER`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN tm_id INTEGER`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN name_search TEXT`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN tm_url TEXT`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN tm_short_name TEXT`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN tm_short_name_search TEXT`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN tm_full_name TEXT`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN tm_full_name_search TEXT`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE players ADD COLUMN last_scraped_at INTEGER`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE sessions ADD COLUMN total_score INTEGER DEFAULT 0`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE sessions ADD COLUMN total_rounds INTEGER DEFAULT 0`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE sessions ADD COLUMN last_round_score INTEGER`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE sessions ADD COLUMN last_round_base INTEGER`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE sessions ADD COLUMN last_round_time_score INTEGER`).run();
  } catch {}
  try {
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_players_tm_id ON players(tm_id)`).run();
  } catch {}
}

