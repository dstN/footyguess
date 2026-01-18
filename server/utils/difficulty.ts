export const TOP5_LEAGUES = ["GB1", "IT1", "L1", "FR1", "ES1"];
export const INTL_COMPS = ["CL", "EL", "UEFA", "EPL", "EPP", "UCOL", "UI"];
export const INTL_WEIGHTS: Record<string, number> = {
  CL: 1.25,
  EL: 1.25,
  UEFA: 0.75,
  EPL: 0.5,
  EPP: 0.5,
  UCOL: 0.75,
  UI: 0.25,
};
export const BASE_POINTS = 100;
export const CLUE_PENALTY = 10;
export const INTL_HARD_THRESHOLD = 45;
export const TOP5_HARD_THRESHOLD = 100;
export const TOP5_EASY_MIN = 100;
export const TOP5_MEDIUM_MIN = 50;

export type DifficultyBasis = "international" | "top5";
export type DifficultyTier = "easy" | "medium" | "hard" | "ultra";

export interface Difficulty {
  basis: DifficultyBasis;
  totalAppearances: number;
  tier: DifficultyTier;
  multiplier: number;
  basePoints: number;
  cluePenalty: number;
}

type StatRow = {
  competition_id: string;
  appearances: number;
  goals: number;
  assists: number;
};

/**
 * Sum goals + assists from stats rows for specific competition IDs.
 */
function sumGoalsAndAssists(stats: StatRow[], ids: string[]) {
  return stats
    .filter((s) => ids.includes(s.competition_id))
    .reduce(
      (acc, s) => acc + (Number(s.goals) || 0) + (Number(s.assists) || 0),
      0,
    );
}

// ... (existing helper functions start here)
/**
 * Sum appearances from stats rows for specific competition IDs.
 */
function sumAppearances(stats: StatRow[], ids: string[]) {
  return stats
    .filter((s) => ids.includes(s.competition_id))
    .reduce((acc, s) => acc + (Number(s.appearances) || 0), 0);
}

/**
 * Calculate weighted appearance count for international competitions.
 */
function sumWeightedInternational(stats: StatRow[]) {
  return stats
    .filter((s) => INTL_COMPS.includes(s.competition_id))
    .reduce((acc, s) => {
      const apps = Number(s.appearances) || 0;
      const weight = INTL_WEIGHTS[s.competition_id] ?? 0.75;
      return acc + apps * weight;
    }, 0);
}

/**
 * Sum goals from stats rows for specific competition IDs.
 */
function sumGoals(stats: StatRow[], ids: string[]) {
  return stats
    .filter((s) => ids.includes(s.competition_id))
    .reduce((acc, s) => acc + (Number(s.goals) || 0), 0);
}

// ... (getTier function unchanged)

export function computeDifficulty(
  stats: StatRow[],
  opts: {
    forceUltra?: boolean;
    isGoalkeeper?: boolean;
    cleanSheets?: number;
  } = {},
): Difficulty {
  const intlApps = sumWeightedInternational(stats);
  const top5Apps = sumAppearances(stats, TOP5_LEAGUES);

  // Calculate Champions League goals and assists for exceptions
  const clGoals = sumGoals(stats, ["CL"]);
  const clGoalsAndAssists = sumGoalsAndAssists(stats, ["CL"]);

  // Default to Ultra
  let tier: { tier: DifficultyTier; multiplier: number } = {
    tier: "ultra",
    multiplier: 4,
  };

  // Check strict AND thresholds (Easy -> Medium -> Hard)
  if (intlApps >= 100 && top5Apps >= 250) {
    tier = { tier: "easy", multiplier: 1 };
  } else if (intlApps >= 80 && top5Apps >= 175) {
    tier = { tier: "medium", multiplier: 2 };
  } else if (intlApps >= 60 && top5Apps >= 125) {
    tier = { tier: "hard", multiplier: 3 };
  }

  // EXCEPTION: Goalkeepers get slightly lower thresholds for Easy
  // Standard Easy is 100/250. GKs get 80/200.
  // This helps legends like Alisson (99), Navas (91), Dida (96) reach Easy.
  if (opts.isGoalkeeper) {
    if (intlApps >= 80 && top5Apps >= 200) {
      tier = { tier: "easy", multiplier: 1 };
    }

    // EXCEPTION: Goalkeeper Clean Sheet-based tiers
    // For legendary GKs who had long careers but fewer international matches
    if (opts.cleanSheets !== undefined) {
      if (opts.cleanSheets > 325 && intlApps > 45) {
        // Upgrade to Easy if not already better
        if (
          tier.tier === "medium" ||
          tier.tier === "hard" ||
          tier.tier === "ultra"
        ) {
          tier = { tier: "easy", multiplier: 1 };
        }
      } else if (opts.cleanSheets > 275 && intlApps > 35) {
        // Upgrade to Medium if not already better
        if (tier.tier === "hard" || tier.tier === "ultra") {
          tier = { tier: "medium", multiplier: 2 };
        }
      } else if (opts.cleanSheets > 225 && intlApps > 25) {
        // Upgrade to Hard if not already better
        if (tier.tier === "ultra") {
          tier = { tier: "hard", multiplier: 3 };
        }
      }
    }
  }

  // EXCEPTION 1: Champions League Goal Scorers (25+)
  if (clGoals >= 25) {
    if (
      tier.tier === "ultra" ||
      tier.tier === "hard" ||
      tier.tier === "medium"
    ) {
      tier = { tier: "easy", multiplier: 1 };
    }
  }

  // EXCEPTION 2: Champions League Icons (Cascading G+A)
  if (clGoalsAndAssists >= 20) {
    if (
      tier.tier === "ultra" ||
      tier.tier === "hard" ||
      tier.tier === "medium"
    ) {
      tier = { tier: "easy", multiplier: 1 };
    }
  } else if (clGoalsAndAssists >= 10) {
    if (tier.tier === "ultra" || tier.tier === "hard") {
      tier = { tier: "medium", multiplier: 2 };
    }
  } else if (clGoalsAndAssists >= 5) {
    if (tier.tier === "ultra") {
      tier = { tier: "hard", multiplier: 3 };
    }
  }

  // Force ultra override
  if (opts.forceUltra) {
    tier = { tier: "ultra", multiplier: 4 };
  }

  // Determine primary basis
  const basis: DifficultyBasis =
    intlApps > top5Apps * 0.2 ? "international" : "top5";

  return {
    basis,
    totalAppearances: basis === "international" ? intlApps : top5Apps,
    tier: tier.tier,
    multiplier: tier.multiplier,
    basePoints: BASE_POINTS,
    cluePenalty: CLUE_PENALTY,
  };
}
