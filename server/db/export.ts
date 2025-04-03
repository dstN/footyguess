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
        t.total_fee,
        t.upcoming,
        c1.name AS from_club,
        c2.name AS to_club
      FROM transfers t
      LEFT JOIN clubs c1 ON t.from_club_id = c1.id
      LEFT JOIN clubs c2 ON t.to_club_id = c2.id
      WHERE t.player_id = ?
      ORDER BY t.transfer_date DESC
    `
      )
      .all(player.id);

    return {
      ...player,
      transfers,
    };
  });

  const fullPath = path.resolve(outputPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(fullPath, JSON.stringify(enriched, null, 2), "utf8");
  console.log(`\n📤 Export abgeschlossen: ${fullPath}`);
}
