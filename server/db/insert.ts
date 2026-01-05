import db from "./connection.ts";

function normalizeSearch(value?: string | null) {
  if (!value) return null;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function upsertClub(id: number, name: string, logoPath: string | null) {
  const stmt = db.prepare(`
    INSERT INTO clubs (id, name, logo_path)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      logo_path = excluded.logo_path;
  `);
  stmt.run(id, name, logoPath);
}

export interface PlayerInsert {
  name: string;
  tm_id?: number | null;
  tm_url?: string | null;
  tm_short_name?: string | null;
  tm_full_name?: string | null;
  last_scraped_at?: number | null;
  birthdate?: string | null;
  height_cm?: number | null;
  active?: number | null;
  retired_since?: string | null;
  foot?: string | null;
  current_club_id?: number | null;
  total_worth?: number | null;
  shirt_number?: number | null;
  main_position?: string | null;
  secondary_positions?: string[] | null;
  birthplace?: string | null;
  nationalities?: string[] | null;
  total_stats?: string[] | null;
}

export function upsertPlayer(player: PlayerInsert) {
  const data = {
    ...player,
    name_search: normalizeSearch(player.name),
    tm_short_name_search: normalizeSearch(player.tm_short_name),
    tm_full_name_search: normalizeSearch(player.tm_full_name),
    secondary_positions: player.secondary_positions
      ? JSON.stringify(player.secondary_positions)
      : null,
    nationalities: player.nationalities
      ? JSON.stringify(player.nationalities)
      : null,
    total_stats: player.total_stats ? JSON.stringify(player.total_stats) : null,
  };

  if (player.tm_id) {
    const stmt = db.prepare(`
      INSERT INTO players (
        name, name_search, tm_id, tm_url, tm_short_name, tm_short_name_search, tm_full_name, tm_full_name_search, last_scraped_at, birthdate, height_cm, active, retired_since, foot, current_club_id,
        total_worth, shirt_number, main_position, secondary_positions,
        birthplace, nationalities, total_stats
      )
      VALUES (
        @name, @name_search, @tm_id, @tm_url, @tm_short_name, @tm_short_name_search, @tm_full_name, @tm_full_name_search, @last_scraped_at, @birthdate, @height_cm, @active, @retired_since, @foot, @current_club_id,
        @total_worth, @shirt_number, @main_position, @secondary_positions,
        @birthplace, @nationalities, @total_stats
      )
      ON CONFLICT(tm_id) DO UPDATE SET
        name = excluded.name,
        name_search = excluded.name_search,
        tm_url = excluded.tm_url,
        tm_short_name = excluded.tm_short_name,
        tm_short_name_search = excluded.tm_short_name_search,
        tm_full_name = excluded.tm_full_name,
        tm_full_name_search = excluded.tm_full_name_search,
        last_scraped_at = excluded.last_scraped_at,
        birthdate = excluded.birthdate,
        height_cm = excluded.height_cm,
        active = excluded.active,
        retired_since = excluded.retired_since,
        foot = excluded.foot,
        current_club_id = excluded.current_club_id,
        total_worth = excluded.total_worth,
        shirt_number = excluded.shirt_number,
        main_position = excluded.main_position,
        secondary_positions = excluded.secondary_positions,
        birthplace = excluded.birthplace,
        nationalities = excluded.nationalities,
        total_stats = excluded.total_stats;
    `);
    stmt.run(data);
    return;
  }

  const stmt = db.prepare(`
      INSERT INTO players (
        name, name_search, tm_id, tm_url, tm_short_name, tm_short_name_search, tm_full_name, tm_full_name_search, last_scraped_at, birthdate, height_cm, active, retired_since, foot, current_club_id,
        total_worth, shirt_number, main_position, secondary_positions,
        birthplace, nationalities, total_stats
      )
      VALUES (
        @name, @name_search, @tm_id, @tm_url, @tm_short_name, @tm_short_name_search, @tm_full_name, @tm_full_name_search, @last_scraped_at, @birthdate, @height_cm, @active, @retired_since, @foot, @current_club_id,
        @total_worth, @shirt_number, @main_position, @secondary_positions,
        @birthplace, @nationalities, @total_stats
      )
      ON CONFLICT(name) DO UPDATE SET
        tm_id = excluded.tm_id,
        tm_url = excluded.tm_url,
        tm_short_name = excluded.tm_short_name,
        tm_short_name_search = excluded.tm_short_name_search,
        tm_full_name = excluded.tm_full_name,
        tm_full_name_search = excluded.tm_full_name_search,
        name_search = excluded.name_search,
        last_scraped_at = excluded.last_scraped_at,
        birthdate = excluded.birthdate,
        height_cm = excluded.height_cm,
        active = excluded.active,
        retired_since = excluded.retired_since,
        foot = excluded.foot,
        current_club_id = excluded.current_club_id,
        total_worth = excluded.total_worth,
        shirt_number = excluded.shirt_number,
        main_position = excluded.main_position,
        secondary_positions = excluded.secondary_positions,
        birthplace = excluded.birthplace,
        nationalities = excluded.nationalities,
        total_stats = excluded.total_stats;
    `);

  stmt.run(data);
}

export function insertTransfer(data: {
  player_id: number;
  season?: string;
  transfer_date?: string;
  from_club_id?: number | null;
  to_club_id?: number | null;
  fee?: string | null;
  transfer_type?: string | null;
  upcoming?: boolean | null;
}) {
  const transferKey = [
    data.season ?? "",
    data.transfer_date ?? "",
    data.from_club_id ?? "",
    data.to_club_id ?? "",
    data.fee ?? "",
    data.transfer_type ?? "",
  ].join("|");

  const stmt = db.prepare(`
    INSERT INTO transfers (
      player_id,
      season,
      transfer_date,
      from_club_id,
      to_club_id,
      fee,
      transfer_type,
      upcoming,
      transfer_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  stmt.run(
    data.player_id,
    data.season ?? null,
    data.transfer_date ?? null,
    data.from_club_id ?? null,
    data.to_club_id ?? null,
    data.fee ?? null,
    data.transfer_type ?? null,
    data.upcoming === undefined ? null : Number(data.upcoming),
    transferKey,
  );
}

export function updatePlayerWorth(playerId: number, totalWorth: number) {
  const stmt = db.prepare(`
    UPDATE players SET total_worth = ? WHERE id = ?
  `);
  stmt.run(totalWorth, playerId);
}

export interface CompetitionInsert {
  id: string;
  name: string;
  logo_path: string | null;
}

export function upsertCompetition(data: CompetitionInsert) {
  const stmt = db.prepare(`
    INSERT INTO competitions (id, name, logo_path)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      logo_path = excluded.logo_path;
  `);
  stmt.run(data.id, data.name, data.logo_path);
}

export interface PlayerStatsInsert {
  player_id: number;
  competition_id: string;
  appearances?: number;
  goals?: number;
  assists?: number;
  own_goals?: number;
  subbed_on?: number;
  subbed_off?: number;
  yellow_cards?: number;
  yellow_red_cards?: number;
  red_cards?: number;
  penalties?: number;
  minutes_played?: number;
  average_minutes_per_match?: number;
}

export function upsertPlayerStats(data: PlayerStatsInsert) {
  const stmt = db.prepare(`
    INSERT INTO player_stats (
      player_id, competition_id, appearances, goals, assists, own_goals,
      subbed_on, subbed_off, yellow_cards, yellow_red_cards, red_cards,
      penalties, minutes_played, average_minutes_per_match
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id, competition_id) DO UPDATE SET
      appearances = excluded.appearances,
      goals = excluded.goals,
      assists = excluded.assists,
      own_goals = excluded.own_goals,
      subbed_on = excluded.subbed_on,
      subbed_off = excluded.subbed_off,
      yellow_cards = excluded.yellow_cards,
      yellow_red_cards = excluded.yellow_red_cards,
      red_cards = excluded.red_cards,
      penalties = excluded.penalties,
      minutes_played = excluded.minutes_played,
      average_minutes_per_match = excluded.average_minutes_per_match;
  `);

  stmt.run(
    data.player_id,
    data.competition_id,
    data.appearances ?? null,
    data.goals ?? null,
    data.assists ?? null,
    data.own_goals ?? null,
    data.subbed_on ?? null,
    data.subbed_off ?? null,
    data.yellow_cards ?? null,
    data.yellow_red_cards ?? null,
    data.red_cards ?? null,
    data.penalties ?? null,
    data.minutes_played ?? null,
    data.average_minutes_per_match ?? null,
  );
}

export function updateTotalStatsForPlayer(
  playerId: number,
  totalStatsJson: string,
) {
  const stmt = db.prepare(`
    UPDATE players SET total_stats = ? WHERE id = ?
  `);
  stmt.run(totalStatsJson, playerId);
}
