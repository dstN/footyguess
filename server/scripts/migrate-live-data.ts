import db from "../db/connection.ts";
import path from "path";
import fs from "fs";

const LIVE_DB_PATH = path.resolve(
  process.cwd(),
  "server/db/file/live_footyguess.db",
);

if (!fs.existsSync(LIVE_DB_PATH)) {
  console.error(`❌ Source DB not found at: ${LIVE_DB_PATH}`);
  process.exit(1);
}

/**
 * Get column names for a table in a specific database
 */
function getColumns(schema: string, table: string): string[] {
  try {
    const rows = db.prepare(`PRAGMA ${schema}.table_info(${table})`).all() as {
      name: string;
    }[];
    return rows.map((r) => r.name);
  } catch (e) {
    console.error(`Error getting columns for ${schema}.${table}:`, e);
    return [];
  }
}

/**
 * Migrate a table by selection only common columns
 */
function migrateTable(tableName: string) {
  console.log(`\n📦 Migrating table: ${tableName}...`);

  try {
    // 1. Get columns from both DBs
    const destColumns = getColumns("main", tableName);
    const srcColumns = getColumns("live", tableName);

    if (destColumns.length === 0) {
      console.error(`   ❌ Table ${tableName} does not exist in destination.`);
      return;
    }
    if (srcColumns.length === 0) {
      console.error(`   ❌ Table ${tableName} does not exist in source.`);
      return;
    }

    // 2. Find intersection
    const commonColumns = destColumns.filter((c) => srcColumns.includes(c));
    const columnList = commonColumns.join(", ");

    console.log(
      `   Found ${commonColumns.length} common columns (skipped ${destColumns.length - commonColumns.length} new columns).`,
    );

    // 3. Copy data
    // Use INSERT OR IGNORE to prevent crashing on duplicate primary keys (preserves existing data)
    const result = db
      .prepare(
        `
      INSERT OR IGNORE INTO main.${tableName} (${columnList})
      SELECT ${columnList} FROM live.${tableName}
    `,
      )
      .run();

    console.log(
      `   ✅ Migrated ${result.changes} rows (ignored duplicates/conflicts).`,
    );
  } catch (e) {
    console.error(`   ❌ Failed to migrate ${tableName}:`, e);
  }
}

function run() {
  console.log("🚀 Starting Data Migration...");
  console.log(`Source: ${LIVE_DB_PATH} (attached as 'live')`);
  console.log(`Destination: footyguess.db (main)`);

  try {
    // Attach the live database
    db.prepare(`ATTACH DATABASE '${LIVE_DB_PATH}' AS live`).run();

    // Tables to migrate
    const tables = [
      "sessions",
      "rounds",
      "scores",
      "leaderboard_entries",
      // Optional: Add others if needed
      // "requested_players"
    ];

    for (const table of tables) {
      migrateTable(table);
    }

    // Detach
    db.prepare("DETACH DATABASE live").run();
    console.log("\n✨ Migration Complete!");
  } catch (e) {
    console.error("\n❌ Fatal Error:", e);
  }
}

run();
