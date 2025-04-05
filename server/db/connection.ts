// 📁 server/db/connection.ts
import Database from "better-sqlite3";

const db = new Database("./server/db/file/footyguess.db");
export default db;
