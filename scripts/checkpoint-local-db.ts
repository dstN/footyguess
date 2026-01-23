import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve("./server/db/file/production/footyguess.db");
console.log(`Opening database at: ${dbPath}`);

try {
  const db = new Database(dbPath);
  console.log("Database shell open. Running checkpoint...");

  // wal_checkpoint(TRUNCATE) will move transactions to DB and truncate WAL file
  db.pragma("wal_checkpoint(TRUNCATE)");

  console.log("Checkpoint completed successfully.");
  db.close();
} catch (error) {
  console.error("Error checkpointing database:", error);
}
