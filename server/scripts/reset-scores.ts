import db from "../db/connection";

function resetScores() {
  console.log("Starting database reset...");
  // Set a short timeout (3s) to fail fast if locked
  db.pragma("busy_timeout = 3000");

  try {
    // Execute in a transaction to ensure atomicity
    const deleteScores = db.prepare("DELETE FROM scores");
    const deleteRounds = db.prepare("DELETE FROM rounds");
    const deleteLeaderboard = db.prepare("DELETE FROM leaderboard_entries");
    const deleteSessions = db.prepare("DELETE FROM sessions");

    const infoScores = deleteScores.run();
    console.log(`Deleted ${infoScores.changes} scores`);

    const infoRounds = deleteRounds.run();
    console.log(`Deleted ${infoRounds.changes} rounds`);

    const infoLeaderboard = deleteLeaderboard.run();
    console.log(`Deleted ${infoLeaderboard.changes} leaderboard entries`);

    const infoSessions = deleteSessions.run();
    console.log(`Deleted ${infoSessions.changes} sessions`);

    console.log("✅ Database reset complete!");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    if (String(error).includes("busy") || String(error).includes("locked")) {
      console.error(
        "TIP: Please stop the running server (npm run dev) to release the database lock.",
      );
    }
  }
}

resetScores();
