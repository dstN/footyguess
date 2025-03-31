// server/utils/cleanup-incomplete-players.ts
import sqlite3 from "sqlite3";

interface PlayerFields {
  nationality: string | null;
  position: string | null;
  shirt_number: string | null;
  birthdate: string | null;
  foot: string | null;
  active: number | null;
}

const db = new sqlite3.Database("server/db/players.db");
export async function cleanupIncompletePlayers(): Promise<void> {
  db.all<{ id: string; name: string }>(
    `SELECT id, name FROM players`,
    (err, rows) => {
      if (err) throw err;

      let deleted = 0;
      let remaining = 0;
      let checked = 0;

      db.serialize(() => {
        for (const row of rows) {
          db.get<PlayerFields>(
            `SELECT nationality, position, shirt_number, birthdate, foot, active FROM players WHERE id = ?`,
            [row.id],
            (err, player) => {
              if (err) throw err;

              const incomplete =
                !player.nationality ||
                !player.position ||
                !player.shirt_number ||
                !player.birthdate ||
                !player.foot ||
                player.active === null;

              if (incomplete) {
                deleted++;
                db.run(`DELETE FROM players WHERE id = ?`, [row.id]);
                db.run(`DELETE FROM transfers WHERE player_id = ?`, [row.id]);
                db.run(`DELETE FROM career WHERE player_id = ?`, [row.id]);
                console.log(`🗑️  ${row.name} (${row.id}) gelöscht`);
              } else {
                remaining++;
              }

              checked++;
              if (checked === rows.length) {
                console.log(`\n✅ Bereinigt!`);
                console.log(`🧾 ${deleted} Spieler gelöscht`);
                console.log(`📊 ${remaining} Spieler verbleiben in der DB`);
                db.close();
              }
            }
          );
        }
      });
    }
  );
}
