// server/utils/analyze-hints.ts
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

interface Player {
  id: string;
  name: string;
  nationality: string | null;
  position: string | null;
  birthdate: string | null;
  deathdate: string | null;
}

export async function analyzeHints() {
  const db = new sqlite3.Database("server/db/players.db");

  db.all<Player>(`SELECT * FROM players`, (err, rows) => {
    if (err) throw err;

    const result = rows.map((player) => ({
      id: player.id,
      name: player.name,
      nationality: !!player.nationality,
      position: !!player.position,
      birthdate: !!player.birthdate,
      deathdate: !!player.deathdate,
    }));

    const outPath = path.resolve("hint-availability.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`📄 Analyse gespeichert unter: ${outPath}`);

    db.close();
  });
}
