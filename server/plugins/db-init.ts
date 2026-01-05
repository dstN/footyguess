import { defineNitroPlugin } from "#imports";
import db from "../db/connection.ts";
import { initSchema } from "../db/schema.ts";

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
});
