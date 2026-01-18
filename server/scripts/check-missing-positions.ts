import db from "../db/connection.ts";

function run() {
  console.log("Checking for missing main_position...");

  const missing = db
    .prepare(
      `
    SELECT id, name, tm_id, tm_url 
    FROM players 
    WHERE main_position IS NULL OR main_position = '' OR main_position = 'Unknown'
  `,
    )
    .all() as { id: number; name: string; tm_id: number; tm_url: string }[];

  const count = missing.length;

  if (count === 0) {
    console.log("\n✅ SUCCESS: All players have a main_position defined.");
  } else {
    console.log(`\n❌ Found ${count} players missing main_position:`);
    missing.forEach((p) => {
      console.log(`- ${p.name} (ID: ${p.id}, TMID: ${p.tm_id})`);
      console.log(`  URL: ${p.tm_url || "N/A"}`);
    });
  }
}

run();
