/**
 * Fix name_search column with proper Unicode normalization
 *
 * SQLite's LOWER() doesn't handle diacritics, so we need to normalize
 * in JavaScript and update the database.
 *
 * Run with: npx tsx server/db/fix-name-search.ts
 */

import db from "./connection.ts";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .toLowerCase();
}

console.log("🔧 Fixing name_search column with proper Unicode normalization\n");

// Get all players where name_search needs updating
const players = db
  .prepare(`SELECT id, name FROM players WHERE name IS NOT NULL`)
  .all() as { id: number; name: string }[];

console.log(`📋 Processing ${players.length} players...`);

const updateStmt = db.prepare(
  `UPDATE players SET name_search = ? WHERE id = ?`,
);

let updated = 0;
let skipped = 0;

const transaction = db.transaction(() => {
  for (const player of players) {
    const normalized = normalizeSearch(player.name);

    // Check if we need to update
    const current = db
      .prepare(`SELECT name_search FROM players WHERE id = ?`)
      .get(player.id) as { name_search: string | null } | undefined;

    if (current?.name_search !== normalized) {
      updateStmt.run(normalized, player.id);
      updated++;

      // Log sample of changes for verification
      if (updated <= 10) {
        console.log(`   ✅ "${player.name}" -> "${normalized}"`);
      }
    } else {
      skipped++;
    }
  }
});

transaction();

console.log(`\n📊 Results:`);
console.log(`   Updated: ${updated} players`);
console.log(`   Skipped: ${skipped} players (already normalized)`);

// Verify a sample
console.log(`\n🔍 Verification sample (players with diacritics):`);
const sample = db
  .prepare(
    `SELECT name, name_search FROM players 
     WHERE name LIKE '%ü%' OR name LIKE '%ö%' OR name LIKE '%ä%' 
        OR name LIKE '%é%' OR name LIKE '%ñ%' OR name LIKE '%ç%'
     LIMIT 5`,
  )
  .all() as { name: string; name_search: string }[];

for (const p of sample) {
  console.log(`   "${p.name}" -> "${p.name_search}"`);
}

console.log(`\n✅ Done!\n`);
