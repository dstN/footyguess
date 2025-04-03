// 📁 server/db/connection.ts
import Database from "better-sqlite3";

const db = new Database("footyguess.db");
export default db;
