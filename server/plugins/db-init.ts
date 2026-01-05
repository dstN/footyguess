import { defineNitroPlugin } from "#imports";
import { initSchema } from "../db/schema.ts";

// Ensure all tables exist (including new scoring tables) when the server boots.
export default defineNitroPlugin(() => {
  initSchema();
});
