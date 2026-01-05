// 📁 server/db/connection.ts
import Database from "better-sqlite3";

const dbPath =
  process.env.FOOTYGUESS_DB_PATH || "./server/db/file/footyguess.db";
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.function("regexp", (pattern: string, value: unknown) => {
  try {
    if (typeof value !== "string") return false;
    const regex = new RegExp(pattern, "i");
    return regex.test(value) ? 1 : 0; // 🚨 SQLite erwartet 0 oder 1, KEIN JS-boolean
  } catch (error) {
    console.error("REGEXP error", { pattern, value, error });
    return 0;
  }
});

export default db;
