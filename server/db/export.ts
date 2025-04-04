// 📁 server/db/export.ts
import fs from "fs";
import path from "path";
import db from "./connection";

export function exportPlayersToJson(outputPath = "output/players.json") {
  const players = db
    .prepare(
      `
    SELECT
      p.id,
      p.name,
      p.birthdate,
      p.height_cm,
      p.active,
      p.retired_since,
      p.foot,
      p.current_club_id,
      p.total_worth,
      p.shirt_number,
      p.birthplace,
      p.main_position,
      p.secondary_positions,
      p.nationalities,
      p.total_stats,
      c.name AS currentClub,
      c.logo_path AS clubLogo
    FROM players p
    LEFT JOIN clubs c ON p.current_club_id = c.id
    ORDER BY p.name ASC;
  `
    )
    .all();

  const enriched = players.map((player: any) => {
    const transfers = db
      .prepare(
        `
      SELECT
        t.season,
        t.transfer_date,
        t.fee,
        t.transfer_type,
        t.upcoming,
        c1.id AS from_club_id,
        c1.name AS from_club,
        c1.logo_path AS from_club_logo,
        c2.id AS to_club_id,
        c2.name AS to_club,
        c2.logo_path AS to_club_logo
      FROM transfers t
      LEFT JOIN clubs c1 ON t.from_club_id = c1.id
      LEFT JOIN clubs c2 ON t.to_club_id = c2.id
      WHERE t.player_id = ?
      ORDER BY t.transfer_date DESC
    `
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
        c.name AS competition,
        c.logo_path AS competition_logo
      FROM player_stats ps
      JOIN competitions c ON ps.competition_id = c.id
      WHERE ps.player_id = ?
      ORDER BY c.name ASC
    `
      )
      .all(player.id);

    return {
      ...player,
      // ggf. Strings wieder zu Arrays parsen
      secondary_positions: player.secondary_positions
        ? JSON.parse(player.secondary_positions)
        : [],
      nationalities: player.nationalities
        ? JSON.parse(player.nationalities)
        : [],
      total_stats: player.total_stats ? JSON.parse(player.total_stats) : [],
      transfers,
      stats,
    };
  });

  const fullPath = path.resolve(outputPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(fullPath, JSON.stringify(enriched, null, 2), "utf8");
  console.log(`\n📤 Export abgeschlossen: ${fullPath}`);
}
