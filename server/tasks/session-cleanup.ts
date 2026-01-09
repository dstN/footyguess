import { defineTask } from "nitropack/runtime";
import { runFullCleanup } from "../utils/session-cleanup";

/**
 * Nitro scheduled task for session cleanup
 * Runs periodically to remove old sessions and expired rounds
 *
 * Can be triggered manually via Nitro's task API or scheduled via cron
 */
export default defineTask({
  meta: {
    name: "session:cleanup",
    description: "Clean up old sessions, rounds, and expired data",
  },
  async run() {
    const stats = runFullCleanup();

    return {
      result: {
        success: true,
        cleaned: stats,
        message: `Cleaned ${stats.sessions} sessions, ${stats.rounds + stats.expiredRounds} rounds, ${stats.scores} scores`,
      },
    };
  },
});
