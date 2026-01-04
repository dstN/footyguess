const TOP5_LEAGUES = ["GB1", "IT1", "L1", "FR1", "ES1"];
const INTL_COMPS = ["CL", "EL", "UEFA", "EPL", "EPP", "UCOL", "UI"];
const INTL_WEIGHTS: Record<string, number> = {
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

function sumAppearances(stats: StatRow[], ids: string[]) {
  return stats
    .filter((s) => ids.includes(s.competition_id))
    .reduce((acc, s) => acc + (Number(s.appearances) || 0), 0);
}

function sumWeightedInternational(stats: StatRow[]) {
  return stats
    .filter((s) => INTL_COMPS.includes(s.competition_id))
    .reduce((acc, s) => {
      const apps = Number(s.appearances) || 0;
      const weight = INTL_WEIGHTS[s.competition_id] ?? 0.75;
      return acc + apps * weight;
    }, 0);
}

function getTier(
  basis: DifficultyBasis,
  totalApps: number,
): { tier: DifficultyTier; multiplier: number } {
  if (basis === "international") {
    if (totalApps > 80) return { tier: "easy", multiplier: 1 };
    if (totalApps >= 60) return { tier: "medium", multiplier: 1.25 };
    if (totalApps >= 45) return { tier: "hard", multiplier: 1.5 };
    return { tier: "ultra", multiplier: 2 };
  }

  // top 5 leagues
  if (totalApps > 400) return { tier: "easy", multiplier: 1 };
  if (totalApps >= 200) return { tier: "medium", multiplier: 1.25 };
  if (totalApps >= 100) return { tier: "hard", multiplier: 1.5 };
  return { tier: "ultra", multiplier: 2 };
}

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
    ? { tier: "ultra" as const, multiplier: 2 }
    : chosen.tier;

  // If a player is flagged easy purely by league apps but has little/no top European experience,
  // downgrade easy to medium to avoid obscure picks feeling trivial.
  if (
    !opts.forceUltra &&
    chosen.basis === "top5" &&
    tier.tier === "easy" &&
    intlApps < 50
  ) {
    tier = { tier: "medium", multiplier: 1.25 };
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
