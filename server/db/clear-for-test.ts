/**
 * Clear database data for testing autonomous scraper
 * (Database backup exists)
 */

import db from "./connection.ts";

console.log("🧹 CLEARING DATABASE FOR AUTONOMOUS SCRAPER TEST\n");

console.log("📋 Clearing players table scrapeable columns...");
db.prepare(
  `
  UPDATE players SET
    tm_url = NULL,
    tm_short_name = NULL,
    tm_short_name_search = NULL,
    tm_full_name = NULL,
    tm_full_name_search = NULL,
    tm_artist_name = NULL,
    tm_artist_name_search = NULL,
    name_search = LOWER(name),
    last_scraped_at = NULL,
    birthdate = NULL,
    height_cm = NULL,
    foot = NULL,
    main_position = NULL,
    secondary_positions = NULL,
    nationalities_ids = NULL,
    total_stats = NULL,
    birthplace = NULL,
    current_club_id = NULL
`,
).run();
console.log(
  "   ✅ Players table scrapeable columns cleared (name, tm_id, nationalities, active, retired_since preserved)",
);

console.log("\n🗑️  Clearing other tables...");

const tables = ["player_stats", "transfers", "competitions"];

tables.forEach((table) => {
  db.prepare(`DELETE FROM ${table}`).run();
  console.log(`   ✅ ${table} cleared`);
});

console.log("\n🗑️  Clearing clubs (except id 0)...");
db.prepare(`DELETE FROM clubs WHERE id != 0`).run();
console.log("   ✅ clubs cleared");

console.log("\n📊 Current state:");
const playerCount = (
  db.prepare(`SELECT COUNT(*) as count FROM players`).get() as any
).count;
const playersWithName = (
  db
    .prepare(`SELECT COUNT(*) as count FROM players WHERE name IS NOT NULL`)
    .get() as any
).count;
const transferCount = (
  db.prepare(`SELECT COUNT(*) as count FROM transfers`).get() as any
).count;
const statsCount = (
  db.prepare(`SELECT COUNT(*) as count FROM player_stats`).get() as any
).count;
const clubCount = (
  db.prepare(`SELECT COUNT(*) as count FROM clubs`).get() as any
).count;

console.log(`   Players: ${playerCount} total, ${playersWithName} with name`);
console.log(`   Transfers: ${transferCount}`);
console.log(`   Stats: ${statsCount}`);
console.log(`   Clubs: ${clubCount}`);

console.log(`\n✅ Database cleared! Ready for autonomous scraper test.\n`);
