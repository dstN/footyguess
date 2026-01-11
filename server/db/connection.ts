// 📁 server/db/connection.ts
import Database from "better-sqlite3";

const dbPath =
  process.env.FOOTYGUESS_DB_PATH || "./server/db/file/footyguess.db";

let db: Database.Database;
try {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
} catch (error) {
  console.error("[db] Failed to initialize database:", error);
  throw new Error(
    `Database initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
}

db.function("regexp", (pattern: string, value: unknown) => {
  try {
    if (typeof value !== "string") return 0;
    // Security: Only allow pre-defined patterns to prevent ReDoS attacks
    const allowedPatterns = [
      "U\\d{1,2}|Yth\\.|Jgd\\.", // Youth team filter
    ];
    if (!allowedPatterns.includes(pattern)) {
      console.warn("[db] Blocked disallowed REGEXP pattern:", pattern);
      return 0;
    }
    const regex = new RegExp(pattern, "i");
    return regex.test(value) ? 1 : 0;
  } catch (error) {
    console.error("REGEXP error", { pattern, value, error });
    return 0;
  }
});

export default db;
