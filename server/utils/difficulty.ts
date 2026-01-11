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

type StatRow = { competition_id: string; appearances: number };

/**
 * Sum appearances from stats rows for specific competition IDs.
 * Used to count total appearances in a group of competitions (e.g., Top 5 leagues).
 *
 * @param stats - Array of player statistics by competition
 * @param ids - Array of competition IDs to sum
 * @returns Total appearances in the specified competitions
 *
 * @example
 * const top5Apps = sumAppearances(stats, TOP5_LEAGUES);
 * // Returns: 250 (total apps in Premier League, La Liga, etc.)
 */
function sumAppearances(stats: StatRow[], ids: string[]) {
  return stats
    .filter((s) => ids.includes(s.competition_id))
    .reduce((acc, s) => acc + (Number(s.appearances) || 0), 0);
}

/**
 * Calculate weighted appearance count for international competitions.
 * Different competitions have different weights based on prestige:
 * - Champions League: 1.25x (most prestigious)
 * - Europa League: 1.25x
 * - UEFA competitions: 0.75x
 * - National league cups: 0.5x
 * - Lesser competitions: 0.25x
 *
 * @param stats - Array of player statistics by competition
 * @returns Weighted sum of international competition appearances
 *
 * @example
 * const intlApps = sumWeightedInternational(stats);
 * // A player with 20 CL apps + 30 Europa apps = 20*1.25 + 30*1.25 = 62.5
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
 * Determine difficulty tier and point multiplier based on appearance count.
 * Tier is determined by competition basis:
 *
 * International basis thresholds:
 * - >80 apps: Easy (1.0x)
 * - 60-80 apps: Medium (1.25x)
 * - 45-60 apps: Hard (1.5x)
 * - <45 apps: Ultra (2.0x)
 *
 * Top 5 leagues basis thresholds:
 * - >400 apps: Easy (1.0x)
 * - 200-400 apps: Medium (1.25x)
 * - 100-200 apps: Hard (1.5x)
 * - <100 apps: Ultra (2.0x)
 *
 * @param basis - Whether calculating by international or top5 league experience
 * @param totalApps - Total weighted appearances
 * @returns Object containing tier name and point multiplier
 *
 * @example
 * getTier("international", 70) // => { tier: 'medium', multiplier: 2 }
 * getTier("top5", 250) // => { tier: 'medium', multiplier: 2 }
 *
 * Multipliers (updated v1.3.0): Easy=1, Medium=2, Hard=3, Ultra=4
 */
function getTier(
  basis: DifficultyBasis,
  totalApps: number,
): { tier: DifficultyTier; multiplier: number } {
  if (basis === "international") {
    if (totalApps > 80) return { tier: "easy", multiplier: 1 };
    if (totalApps >= 60) return { tier: "medium", multiplier: 2 };
    if (totalApps >= INTL_HARD_THRESHOLD) {
      return { tier: "hard", multiplier: 3 };
    }
    return { tier: "ultra", multiplier: 4 };
  }

  // top 5 leagues
  if (totalApps > 400) return { tier: "easy", multiplier: 1 };
  if (totalApps >= 200) return { tier: "medium", multiplier: 2 };
  if (totalApps >= TOP5_HARD_THRESHOLD) {
    return { tier: "hard", multiplier: 3 };
  }
  return { tier: "ultra", multiplier: 4 };
}

/**
 * Compute the difficulty tier for a player based on their competition appearances.
 *
 * Algorithm:
 * 1. Calculate weighted international appearances (applies INTL_WEIGHTS multipliers)
 * 2. Calculate total Top 5 league appearances
 * 3. Prefer international tier if it's not ultra; otherwise use Top 5 tier
 * 4. Special case: if basis is Top 5 and tier is easy but intl apps <50, downgrade to medium
 *    (to prevent obscure players from feeling too easy)
 * 5. Special case: if basis is Top 5 and tier is medium but intl apps <20, downgrade to hard
 *    (to prevent domestic-only players in medium tier)
 * 6. Special case: if basis is international and tier is easy but top5 apps <50, downgrade to medium
 *    (to prevent players with tons of intl apps but few top5 league games from being too easy)
 * 7. Special case: if basis is international and tier is medium but top5 apps <10, downgrade to hard
 *    (to prevent players with moderate intl apps but minimal top5 league presence)
 * 8. Apply forceUltra override if specified (for hard mode)
 *
 * @param stats - Array of player statistics with competition_id and appearances
 * @param opts - Options object
 * @param opts.forceUltra - If true, always return ultra tier (for hard mode)
 * @returns Difficulty object with tier, multiplier, basis, and total appearances
 *
 * @example
 * const difficulty = computeDifficulty(playerStats);
 * // Returns: {
 * //   tier: 'hard',
 * //   multiplier: 1.5,
 * //   basis: 'international',
 * //   totalAppearances: 55,
 * //   basePoints: 100,
 * //   cluePenalty: 10
 * // }
 *
 * @example
 * // Hard mode forces ultra difficulty
 * const hardModeDiff = computeDifficulty(playerStats, { forceUltra: true });
 * // Returns: { tier: 'ultra', multiplier: 2, ...}
 */
export function computeDifficulty(
  stats: StatRow[],
  opts: { forceUltra?: boolean } = {},
): Difficulty {
  const intlApps = sumWeightedInternational(stats);
  const top5Apps = sumAppearances(stats, TOP5_LEAGUES);

  // Prefer international weighted apps; fall back to top5 only when international doesn't meet thresholds.
  const intlTier = intlApps > 0 ? getTier("international", intlApps) : null;
  const top5Tier = top5Apps > 0 ? getTier("top5", top5Apps) : null;

  let chosen: {
    basis: DifficultyBasis;
    total: number;
    tier: { tier: DifficultyTier; multiplier: number };
  };

  if (intlTier && intlTier.tier !== "ultra") {
    chosen = { basis: "international", total: intlApps, tier: intlTier };
  } else if (top5Tier) {
    chosen = { basis: "top5", total: top5Apps, tier: top5Tier };
  } else if (intlTier) {
    chosen = { basis: "international", total: intlApps, tier: intlTier };
  } else {
    const fallback = getTier("international", 0);
    chosen = { basis: "international", total: 0, tier: fallback };
  }

  let tier = opts.forceUltra
    ? { tier: "ultra" as const, multiplier: 4 }
    : chosen.tier;

  // If a player is flagged easy purely by league apps but has little/no top European experience,
  // downgrade easy to medium to avoid obscure picks feeling trivial.
  if (
    !opts.forceUltra &&
    chosen.basis === "top5" &&
    tier.tier === "easy" &&
    intlApps < 50
  ) {
    tier = { tier: "medium", multiplier: 2 };
  }

  // If a player is flagged medium by league apps but has minimal international experience,
  // downgrade to hard to ensure domestic-only players aren't too easy.
  if (
    !opts.forceUltra &&
    chosen.basis === "top5" &&
    tier.tier === "medium" &&
    intlApps < 35
  ) {
    tier = { tier: "hard", multiplier: 3 };
  }

  // If a player is flagged easy by international apps but has minimal top5 league experience,
  // downgrade to medium to prevent players who only play in weaker leagues from being too easy.
  if (
    !opts.forceUltra &&
    chosen.basis === "international" &&
    tier.tier === "easy" &&
    top5Apps < TOP5_EASY_MIN
  ) {
    tier = { tier: "medium", multiplier: 2 };
  }

  // If a player is flagged medium by international apps but has very minimal top5 league experience,
  // downgrade to hard to prevent obscure players with moderate intl apps from being too easy.
  if (
    !opts.forceUltra &&
    chosen.basis === "international" &&
    tier.tier === "medium" &&
    top5Apps < TOP5_MEDIUM_MIN
  ) {
    tier = { tier: "hard", multiplier: 3 };
  }

  // Allow ultra tier even in normal mode; forceUltra still overrides.
  const normalizedTier = tier;

  return {
    basis: chosen.basis,
    totalAppearances: chosen.total,
    tier: normalizedTier.tier,
    multiplier: normalizedTier.multiplier,
    basePoints: BASE_POINTS,
    cluePenalty: CLUE_PENALTY,
  };
}
