// 📁 server/db/insert.ts
import db from "./connection";

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
  birthdate?: string | null;
  height_cm?: number | null;
  active?: number | null;
  retired_since?: string | null;
  foot?: string | null;
  current_club_id?: number | null;
}

export function upsertPlayer(player: PlayerInsert) {
  const stmt = db.prepare(`
    INSERT INTO players (name, birthdate, height_cm, active, retired_since, foot, current_club_id)
    VALUES (@name, @birthdate, @height_cm, @active, @retired_since, @foot, @current_club_id)
    ON CONFLICT(name) DO UPDATE SET
      birthdate = excluded.birthdate,
      height_cm = excluded.height_cm,
      active = excluded.active,
      retired_since = excluded.retired_since,
      foot = excluded.foot,
      current_club_id = excluded.current_club_id;
  `);
  stmt.run(player);
}

export function insertTransfer(data: {
  player_id: number;
  season?: string;
  transfer_date?: string;
  from_club_id?: number | null;
  to_club_id?: number | null;
  fee?: string | null;
  transfer_type?: string | null;
  total_fee?: number | null;
  upcoming?: boolean | null;
}) {
  const stmt = db.prepare(`
    INSERT INTO transfers (
      player_id,
      season,
      transfer_date,
      from_club_id,
      to_club_id,
      fee,
      transfer_type,
      total_fee,
      upcoming
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
    data.total_fee ?? null,
    data.upcoming === undefined ? null : Number(data.upcoming)
  );
}
