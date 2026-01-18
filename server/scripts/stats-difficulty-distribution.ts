import db from "../db/connection.ts";
import { computeDifficulty } from "../utils/difficulty.ts";
import type { DifficultyTier } from "../utils/difficulty.ts";

function run() {
  console.log("Analyzing Player Difficulty Distribution...");

  // 1. Fetch all stats
  console.log("Fetching all player stats...");
  console.log("Fetching all player stats...");
  console.log("Fetching all player stats...");
  const allStats = db
    .prepare(
      "SELECT player_id, competition_id, appearances, goals, assists FROM player_stats",
    )
    .all() as {
    player_id: number;
    competition_id: string;
    appearances: number;
    goals: number;
    assists: number;
  }[];

  // Fetch player metadata for goalkeeper check
  const players = db
    .prepare("SELECT id, main_position, total_stats FROM players")
    .all() as {
    id: number;
    main_position: string | null;
    total_stats: string | null;
  }[];

  const playerMetadata = new Map<
    number,
    { isGoalkeeper: boolean; cleanSheets?: number }
  >();

  for (const p of players) {
    const isGoalkeeper = p.main_position?.includes("Goalkeeper") || false;
    let cleanSheets: number | undefined;

    if (isGoalkeeper && p.total_stats) {
      try {
        const totalStats = JSON.parse(p.total_stats);
        if (totalStats.clean_sheets !== undefined) {
          cleanSheets = Number(totalStats.clean_sheets) || 0;
        }
      } catch {
        // Ignore parse errors
      }
    }

    playerMetadata.set(p.id, { isGoalkeeper, cleanSheets });
  }

  // 2. Group by player
  const playerStatsMap = new Map<
    number,
    {
      competition_id: string;
      appearances: number;
      goals: number;
      assists: number;
    }[]
  >();

  for (const row of allStats) {
    if (!playerStatsMap.has(row.player_id)) {
      playerStatsMap.set(row.player_id, []);
    }
    playerStatsMap.get(row.player_id)!.push({
      competition_id: row.competition_id,
      appearances: row.appearances,
      goals: row.goals,
      assists: row.assists,
    });
  }

  // 3. Compute difficulty for all
  console.log(`Computed stats for ${playerStatsMap.size} players.`);

  const distribution: Record<DifficultyTier, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    ultra: 0,
  };

  for (const [playerId, stats] of playerStatsMap) {
    const metadata = playerMetadata.get(playerId) || {
      isGoalkeeper: false,
    };
    const diff = computeDifficulty(stats, {
      isGoalkeeper: metadata.isGoalkeeper,
      cleanSheets: metadata.cleanSheets,
    });
    distribution[diff.tier]++;
  }

  // 4. Output results
  const totalPlayers = playerStatsMap.size;
  console.log("\n--- Difficulty Distribution ---");
  console.log(
    `Easy:   ${distribution.easy} (${((distribution.easy / totalPlayers) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Medium: ${distribution.medium} (${((distribution.medium / totalPlayers) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Hard:   ${distribution.hard} (${((distribution.hard / totalPlayers) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Ultra:  ${distribution.ultra} (${((distribution.ultra / totalPlayers) * 100).toFixed(1)}%)`,
  );

  console.log("\n--- Difficulty Rules ---");
  console.log("International weighted: CL/EL=1.25x, others=0.25-0.75x");
  console.log("Top 5 Leagues: GB1, ES1, IT1, L1, FR1");

  console.log("\n[BASE THRESHOLDS - Must meet BOTH criteria]");
  console.log("  Easy:   >= 100 Intl  AND  >= 250 Top5");
  console.log("  Medium: >= 80 Intl   AND  >= 175 Top5");
  console.log("  Hard:   >= 60 Intl   AND  >= 125 Top5");
  console.log("  Ultra:  Everything else");

  console.log("\n[EXCEPTION 1 - Champions League Goals]");
  console.log("  >= 25 CL Goals → Upgrade to Easy");

  console.log("\n[EXCEPTION 2 - Champions League Performance]");
  console.log("  >= 20 CL G+A → Upgrade to Easy");
  console.log("  10-19 CL G+A → Upgrade to Medium");
  console.log("  5-9 CL G+A   → Upgrade to Hard");

  console.log("\n[GOALKEEPER EXCEPTIONS]");
  console.log("  Reduced Apps Threshold: >= 80 Intl AND >= 200 Top5 → Easy");
  console.log("  Clean Sheets:");
  console.log("    > 325 CS AND > 45 Intl → Easy");
  console.log("    > 275 CS AND > 35 Intl → Medium");
  console.log("    > 225 CS AND > 25 Intl → Hard");

  console.log("\nNote: All exceptions only upgrade tiers, never downgrade.");
}

run();
