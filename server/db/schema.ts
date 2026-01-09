import db from "./connection.ts";

/**
 * Run a migration that may fail if already applied.
 * Logs debug info instead of silently swallowing errors.
 */
function runMigration(sql: string, description?: string): void {
  try {
    db.prepare(sql).run();
  } catch (error) {
    // Check if it's an expected "already exists" error
    const msg = error instanceof Error ? error.message : String(error);
    const isExpected =
      msg.includes("duplicate column name") ||
      msg.includes("already exists") ||
      msg.includes("no such index");

    if (!isExpected) {
      console.warn(
        `[schema] Migration failed${description ? ` (${description})` : ""}: ${msg}`,
      );
    }
  }
}

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
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nationalities (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      season TEXT,
      transfer_date TEXT,
      from_club_id INTEGER,
      to_club_id INTEGER,
      fee INTEGER,
      transfer_type TEXT,
      upcoming INTEGER,
      transfer_key TEXT,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (from_club_id) REFERENCES clubs(id),
      FOREIGN KEY (to_club_id) REFERENCES clubs(id),
      UNIQUE (player_id, transfer_date),
      UNIQUE (player_id, transfer_key)
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY UNIQUE,
      name TEXT NOT NULL
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
      base_score INTEGER,
      malice_penalty REAL,
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

    CREATE TABLE IF NOT EXISTS scrape_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_run_at INTEGER DEFAULT (strftime('%s','now')),
      last_error TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE (type, target)
    );

    CREATE TABLE IF NOT EXISTS scrape_jobs_dlq (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      priority INTEGER NOT NULL,
      attempts INTEGER NOT NULL,
      last_error TEXT,
      original_created_at INTEGER,
      failed_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_players_name_search ON players(name_search);
    CREATE INDEX IF NOT EXISTS idx_players_tm_short_name_search ON players(tm_short_name_search);
    CREATE INDEX IF NOT EXISTS idx_players_tm_full_name_search ON players(tm_full_name_search);
    CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_next ON scrape_jobs(status, next_run_at);
    CREATE INDEX IF NOT EXISTS idx_transfers_player_date ON transfers(player_id, transfer_date DESC);
    
    -- Performance optimization indexes (Issue #42)
    CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds(session_id);
    CREATE INDEX IF NOT EXISTS idx_scores_session_id ON scores(session_id);
    CREATE INDEX IF NOT EXISTS idx_scores_round_id ON scores(round_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_player_id ON rounds(player_id);
  `);

  // lightweight migrations for added columns
  runMigration(
    `ALTER TABLE scores ADD COLUMN base_score INTEGER`,
    "scores.base_score",
  );
  runMigration(
    `ALTER TABLE scores ADD COLUMN time_score INTEGER`,
    "scores.time_score",
  );
  runMigration(
    `ALTER TABLE scores ADD COLUMN malice_penalty REAL`,
    "scores.malice_penalty",
  );

  // Drop the UNIQUE index if it exists (no longer needed)
  runMigration(
    `DROP INDEX IF EXISTS idx_scores_round_id_unique`,
    "drop idx_scores_round_id_unique",
  );

  runMigration(`ALTER TABLE players ADD COLUMN tm_id INTEGER`, "players.tm_id");
  runMigration(
    `ALTER TABLE players ADD COLUMN name_search TEXT`,
    "players.name_search",
  );
  runMigration(`ALTER TABLE players ADD COLUMN tm_url TEXT`, "players.tm_url");
  runMigration(
    `ALTER TABLE players ADD COLUMN tm_short_name TEXT`,
    "players.tm_short_name",
  );
  runMigration(
    `ALTER TABLE players ADD COLUMN tm_short_name_search TEXT`,
    "players.tm_short_name_search",
  );
  runMigration(
    `ALTER TABLE players ADD COLUMN tm_full_name TEXT`,
    "players.tm_full_name",
  );
  runMigration(
    `ALTER TABLE players ADD COLUMN tm_full_name_search TEXT`,
    "players.tm_full_name_search",
  );
  runMigration(
    `ALTER TABLE players ADD COLUMN last_scraped_at INTEGER`,
    "players.last_scraped_at",
  );
  runMigration(
    `ALTER TABLE transfers ADD COLUMN transfer_key TEXT`,
    "transfers.transfer_key",
  );
  runMigration(
    `ALTER TABLE sessions ADD COLUMN total_score INTEGER DEFAULT 0`,
    "sessions.total_score",
  );
  runMigration(
    `ALTER TABLE sessions ADD COLUMN total_rounds INTEGER DEFAULT 0`,
    "sessions.total_rounds",
  );
  runMigration(
    `ALTER TABLE sessions ADD COLUMN last_round_score INTEGER`,
    "sessions.last_round_score",
  );
  runMigration(
    `ALTER TABLE sessions ADD COLUMN last_round_base INTEGER`,
    "sessions.last_round_base",
  );
  runMigration(
    `ALTER TABLE sessions ADD COLUMN last_round_time_score INTEGER`,
    "sessions.last_round_time_score",
  );
  runMigration(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_players_tm_id ON players(tm_id)`,
    "idx_players_tm_id",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_players_name_search ON players(name_search)`,
    "idx_players_name_search",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_players_tm_short_name_search ON players(tm_short_name_search)`,
    "idx_players_tm_short_name_search",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_players_tm_full_name_search ON players(tm_full_name_search)`,
    "idx_players_tm_full_name_search",
  );

  // Drop old unique index that conflicts with player-specific round scores
  runMigration(
    `DROP INDEX IF EXISTS idx_leaderboard_session_type`,
    "drop idx_leaderboard_session_type",
  );

  // Create unique index for total/streak entries (non-player-specific)
  runMigration(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_session_type_non_round ON leaderboard_entries(session_id, type) WHERE type != 'round'`,
    "idx_leaderboard_session_type_non_round",
  );

  // Add player_id column for player-specific round scores
  runMigration(
    `ALTER TABLE leaderboard_entries ADD COLUMN player_id INTEGER`,
    "leaderboard_entries.player_id",
  );

  // Create index for player-specific round lookups
  runMigration(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_player_round ON leaderboard_entries(session_id, type, player_id) WHERE type = 'round' AND player_id IS NOT NULL`,
    "idx_leaderboard_player_round",
  );
  runMigration(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_round_id ON scores(round_id)`,
    "idx_scores_round_id",
  );
  runMigration(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_player_key ON transfers(player_id, transfer_key)`,
    "idx_transfers_player_key",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_next ON scrape_jobs(status, next_run_at)`,
    "idx_scrape_jobs_status_next",
  );
  runMigration(
    `ALTER TABLE rounds ADD COLUMN max_clues_allowed INTEGER DEFAULT 10`,
    "rounds.max_clues_allowed",
  );

  // Issue #42: Add missing performance indexes
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id)`,
    "idx_player_stats_player_id",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds(session_id)`,
    "idx_rounds_session_id",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_scores_session_id ON scores(session_id)`,
    "idx_scores_session_id",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_rounds_player_id ON rounds(player_id)`,
    "idx_rounds_player_id",
  );

  // Issue #89: Add leaderboard performance indexes
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_leaderboard_type_value ON leaderboard_entries(type, value DESC)`,
    "idx_leaderboard_type_value",
  );
  runMigration(
    `CREATE INDEX IF NOT EXISTS idx_leaderboard_player_id ON leaderboard_entries(player_id)`,
    "idx_leaderboard_player_id",
  );
}
