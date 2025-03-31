// server/utils/extend-player-info.ts
import sqlite3 from "sqlite3";
import fetch from "node-fetch";

const endpoint = "https://query.wikidata.org/sparql";

function buildQuery(qid: string): string {
  return `
    SELECT ?birthdate ?birthplaceLabel ?nationalityLabel ?positionLabel ?deathdate WHERE {
      OPTIONAL { wd:${qid} wdt:P569 ?birthdate. }
      OPTIONAL { wd:${qid} wdt:P19 ?birthplace. }
      OPTIONAL { wd:${qid} wdt:P27 ?nationality. }
      OPTIONAL { wd:${qid} wdt:P413 ?position. }
      OPTIONAL { wd:${qid} wdt:P570 ?deathdate. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;
}

type WikiField = { value: string };

type Result = {
  birthdate?: WikiField;
  birthplaceLabel?: WikiField;
  nationalityLabel?: WikiField;
  positionLabel?: WikiField;
  deathdate?: WikiField;
};

export async function extendPlayers(): Promise<void> {
  const db = new sqlite3.Database("server/db/players.db");

  db.all<{ id: string }>(`SELECT id FROM players`, async (err, rows) => {
    if (err) throw err;

    const total = rows.length;
    let count = 0;

    for (const row of rows) {
      count++;

      const query = buildQuery(row.id);
      const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;

      try {
        const res = await fetch(url);
        const json = (await res.json()) as { results: { bindings: Result[] } };

        const result = json.results.bindings[0];
        if (!result) continue;

        const values = {
          birthdate: result.birthdate?.value ?? null,
          birthplace: result.birthplaceLabel?.value ?? null,
          nationality: result.nationalityLabel?.value ?? null,
          position: result.positionLabel?.value ?? null,
          deathdate: result.deathdate?.value ?? null,
        };

        const stmt = db.prepare(`
          UPDATE players SET
            birthdate = ?,
            birthplace = ?,
            nationality = ?,
            position = ?,
            deathdate = ?
          WHERE id = ?
        `);

        stmt.run(
          values.birthdate,
          values.birthplace,
          values.nationality,
          values.position,
          values.deathdate,
          row.id
        );

        stmt.finalize();
        console.log(`✔️ [${count}/${total}] ${row.id} erweitert`);
      } catch (err) {
        console.error(`❌ Fehler bei ${row.id}:`, err);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    db.close();
  });
}
