import { defineNitroPlugin } from "nitropack/runtime";
import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";
import { runFullCleanup } from "../utils/session-cleanup";
import { logInfo } from "../utils/logger";

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
  }
});
