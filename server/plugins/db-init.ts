import { defineNitroPlugin } from "nitropack/runtime";
import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { runFullCleanup } from "../utils/session-cleanup";
import { logInfo } from "../utils/logger";

// Cleanup interval: run every 6 hours (in milliseconds)
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Ensure all tables exist (including new scoring tables) when the server boots.
export default defineNitroPlugin(() => {
  initSchema();

  // Verify that foreign key constraints are enabled
  const fkStatus = db.prepare("PRAGMA foreign_keys").get() as {
    foreign_keys: number;
  };
  if (fkStatus.foreign_keys !== 1) {
    throw new Error(
      "FATAL: Foreign key constraints not enabled. Aborting server startup.",
    );
  }

  // Run session cleanup on startup (production only to avoid slowing dev)
  if (process.env.NODE_ENV === "production") {
    const stats = runFullCleanup();
    if (stats.sessions > 0 || stats.expiredRounds > 0) {
      logInfo(
        `Startup cleanup: ${stats.sessions} sessions, ${stats.rounds + stats.expiredRounds} rounds`,
        "db-init",
        stats,
      );
    }

    // Schedule periodic cleanup every 6 hours
    setInterval(() => {
      try {
        const periodicStats = runFullCleanup();
        if (periodicStats.sessions > 0 || periodicStats.expiredRounds > 0) {
          logInfo(
            `Periodic cleanup: ${periodicStats.sessions} sessions, ${periodicStats.rounds + periodicStats.expiredRounds} rounds`,
            "session-cleanup",
            periodicStats,
          );
        }
      } catch (error) {
        // Log but don't crash - cleanup is non-critical
        console.error("[session-cleanup] Periodic cleanup failed:", error);
      }
    }, CLEANUP_INTERVAL_MS);

    logInfo("Scheduled session cleanup every 6 hours", "db-init");
  }
});
