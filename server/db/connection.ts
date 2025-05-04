// 📁 server/db/connection.ts
import Database from "better-sqlite3";

const db = new Database("./server/db/file/footyguess.db");

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
