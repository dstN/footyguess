import db from "../db/connection";
import { resetScores } from "../services/admin.ts";

console.log("Starting database reset...");
db.pragma("busy_timeout = 3000");

try {
  const result = resetScores();
  console.log(`Deleted ${result.scores} scores`);
  console.log(`Deleted ${result.rounds} rounds`);
  console.log(`Deleted ${result.leaderboard} leaderboard entries`);
  console.log(`Deleted ${result.sessions} sessions`);
  console.log("✅ Database reset complete!");
} catch (error) {
  console.error("❌ Error resetting database:", error);
  if (String(error).includes("busy") || String(error).includes("locked")) {
    console.error(
      "TIP: Please stop the running server (npm run dev) to release the database lock.",
    );
  }
}
