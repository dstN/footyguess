import db from "../../server/db/connection";
import { initSchema } from "../../server/db/schema";

export function resetDb() {
  initSchema();
  db.exec("DELETE FROM scores;");
  db.exec("DELETE FROM rounds;");
  db.exec("DELETE FROM leaderboard_entries;");
  db.exec("DELETE FROM sessions;");
  db.exec("DELETE FROM transfers;");
  db.exec("DELETE FROM player_stats;");
  db.exec("DELETE FROM players;");
  db.exec("DELETE FROM clubs;");
  db.exec("DELETE FROM competitions;");
  db.exec("DELETE FROM requested_players;");
  db.exec("DELETE FROM scrape_jobs;");
}

export default db;
