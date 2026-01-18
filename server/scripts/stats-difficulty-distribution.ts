import db from "../db/connection.ts";
import { computeDifficulty } from "../utils/difficulty.ts";
import type { DifficultyTier } from "../utils/difficulty.ts";

function run() {
  console.log("Analyzing Player Difficulty Distribution...");

  // 1. Fetch all stats
  console.log("Fetching all player stats...");
  const allStats = db
    .prepare("SELECT player_id, competition_id, appearances FROM player_stats")
    .all() as {
    player_id: number;
    competition_id: string;
    appearances: number;
  }[];

  // 2. Group by player
  const playerStatsMap = new Map<
    number,
    { competition_id: string; appearances: number }[]
  >();

  for (const row of allStats) {
    if (!playerStatsMap.has(row.player_id)) {
      playerStatsMap.set(row.player_id, []);
    }
    playerStatsMap.get(row.player_id)!.push({
      competition_id: row.competition_id,
      appearances: row.appearances,
    });
  }

  // 3. Compute difficulty for each player
  const distribution: Record<DifficultyTier, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    ultra: 0,
  };

  const totalPlayers = playerStatsMap.size;
  console.log(`Computed stats for ${totalPlayers} players.`);

  for (const stats of playerStatsMap.values()) {
    const diff = computeDifficulty(stats);
    distribution[diff.tier]++;
  }

  // 4. Output results
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

  console.log("\n--- Difficulty Rules (approximate) ---");
  console.log("International (weighted): CL/EL=1.25x, others=0.25-0.75x");
  console.log("Top 5 Leagues: Sum of apps in GB1, ES1, IT1, L1, FR1");
  console.log("\nBase Thresholds (International OR Top 5):");
  console.log("Easy:   >80 Intl  OR  >400 Top5");
  console.log("Medium: >60 Intl  OR  >200 Top5");
  console.log("Hard:   >45 Intl  OR  >100 Top5");
  console.log("Ultra:  <45 Intl  AND <100 Top5");
  console.log("\nDowngrade Rules (Cross-Checks):");
  console.log("1. Rated Easy (Top5) but <50 Intl Apps -> Medium");
  console.log("2. Rated Med  (Top5) but <35 Intl Apps -> Hard");
  console.log("3. Rated Easy (Intl) but <100 Top5 Apps -> Medium");
  console.log("4. Rated Med  (Intl) but <50 Top5 Apps  -> Hard");
}

run();
