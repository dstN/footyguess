// server/utils/fetch-career.ts
import sqlite3 from "sqlite3";
import fetch from "node-fetch";

const endpoint = "https://query.wikidata.org/sparql";

function buildQuery(qid: string): string {
  return `
    SELECT ?club ?clubLabel ?start ?end ?matches WHERE {
    wd:${qid} p:P54 ?statement.
    ?statement ps:P54 ?club.
    OPTIONAL { ?statement pq:P580 ?start. }
    OPTIONAL { ?statement pq:P582 ?end. }
    OPTIONAL { ?statement pq:P1350 ?matches. }

    ?club wdt:P31 ?type.
    FILTER(?type IN (wd:Q476028, wd:Q20639856, wd:Q103229495))

    SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
  }
  ORDER BY ASC(?start)

  `;
}

interface Result {
  club: { value: string };
  clubLabel?: { value: string };
  start?: { value: string };
  end?: { value: string };
}

export async function fetchCareer(): Promise<void> {
  const db = new sqlite3.Database("server/db/players.db");

  db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS career`);
    db.run(`
      CREATE TABLE career (
        player_id TEXT,
        start_year INTEGER,
        end_year INTEGER,
        club TEXT,
        club_id TEXT
      )
    `);
  });

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

        for (const entry of json.results.bindings) {
          const clubId = entry.club.value.split("/").pop() || null;
          const clubName = entry.clubLabel?.value || "Unbekannt";
          const startYear = entry.start?.value?.substring(0, 4) || null;
          const endYear = entry.end?.value?.substring(0, 4) || null;

          const stmt = db.prepare(`
            INSERT INTO career (player_id, start_year, end_year, club, club_id)
            VALUES (?, ?, ?, ?, ?)
          `);

          stmt.run(
            row.id,
            startYear ? parseInt(startYear) : null,
            endYear ? parseInt(endYear) : null,
            clubName,
            clubId
          );

          stmt.finalize();
        }

        console.log(
          `✔️ [${count}/${total}] Karriere für ${row.id} gespeichert`
        );
      } catch (err) {
        console.error(`❌ Fehler bei ${row.id}:`, err);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    db.close();
  });
}
