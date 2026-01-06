import db from "./connection.ts";
import fs from "fs";

type DupRow = {
  tm_id: number;
  count: number;
};

type PlayerRow = {
  id: number;
  name: string;
  tm_id: number;
  tm_url: string | null;
};

const duplicates = db
  .prepare(
    `
    SELECT tm_id, COUNT(*) as count
    FROM players
    WHERE tm_id IS NOT NULL
    GROUP BY tm_id
    HAVING COUNT(*) > 1
  `,
  )
  .all() as DupRow[];

if (!duplicates.length) {
  console.log("No duplicate tm_id values found.");
  process.exit(0);
}

for (const dup of duplicates) {
  console.log(`tm_id ${dup.tm_id} has ${dup.count} entries:`);
  const players = db
    .prepare(
      `
      SELECT id, name, tm_id, tm_url
      FROM players
      WHERE tm_id = ?
      ORDER BY id ASC
    `,
    )
    .all(dup.tm_id) as PlayerRow[];
  for (const player of players) {
    console.log(
      `  - ${player.id}: ${player.name} (${player.tm_url ?? "no url"})`,
    );
  }
}

const errorLog = "error.txt";
const duplicateNames = duplicates.flatMap((dup) =>
  db
    .prepare(
      `
      SELECT name
      FROM players
      WHERE tm_id = ?
      ORDER BY id ASC
    `,
    )
    .all(dup.tm_id)
    .map((row: any) => row.name),
);

if (duplicateNames.length) {
  fs.appendFileSync(errorLog, `${duplicateNames.join("\n")}\n`, "utf8");
  console.log(`Appended ${duplicateNames.length} names to ${errorLog}.`);
}
