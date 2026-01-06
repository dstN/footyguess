import type { Difficulty } from "./difficulty.ts";

export interface ScoreBreakdown {
  base: number;
  multiplier: number;
  timeMultiplier: number;
  cluesUsed: number;
  cluePenalty: number;
  preStreak: number;
  timeScore: number;
  streakBonus: number;
  finalScore: number;
  malicePenalty?: number;
}

export function getStreakBonusMultiplier(streak: number) {
  if (streak >= 100) return 0.3;
  if (streak >= 60) return 0.2;
  if (streak >= 30) return 0.15;
  if (streak >= 15) return 0.1;
  if (streak >= 5) return 0.05;
  return 0;
}

export function calculateScore(
  difficulty: Difficulty,
  cluesUsed: number,
  streak: number,
  opts: {
    elapsedSeconds?: number;
    floor?: number;
    missedGuesses?: number;
  } = {},
): ScoreBreakdown {
  const basePoints = difficulty.basePoints;
  const multiplier = difficulty.multiplier;
  const cluePenalty = difficulty.cluePenalty;
  const floor = opts.floor ?? 10;

  const preStreak = Math.max(
    Math.round(basePoints * multiplier - cluesUsed * cluePenalty),
    floor,
  );

  const streakBonus = getStreakBonusMultiplier(streak);
  const timeBonus = clampTimeBonus(getTimeBonus(opts.elapsedSeconds));

  // Calculate malice penalty: -2% per missed guess, max -50%
  const missedGuesses = opts.missedGuesses ?? 0;
  const malicePenalty = Math.max(-0.5, -0.02 * missedGuesses);

  // Time bonus is additive: 0.2 = +20%, -0.5 = -50%
  // Apply time bonus to preStreak, minimum is 10% of preStreak or floor
  const timeAdjusted = Math.max(
    preStreak * (1 + timeBonus),
    preStreak * 0.1,
    floor,
  );
  const timeScore = Math.round(timeAdjusted);

  // Apply malice penalty to final score
  const beforeMalice = Math.round(timeScore * (1 + streakBonus));
  const finalScore = Math.round(beforeMalice * (1 + malicePenalty));

  return {
    base: basePoints,
    multiplier,
    timeMultiplier: 1 + timeBonus, // For display: actual multiplier applied
    cluesUsed,
    cluePenalty,
    preStreak,
    timeScore,
    streakBonus,
    finalScore,
    malicePenalty,
  };
}

export function getTimeBonus(elapsedSeconds?: number): number {
  if (elapsedSeconds === undefined || elapsedSeconds === null) return 0;

  // First second: max bonus (instant guess)
  if (elapsedSeconds <= 1) return 1.2;

  // From 1s to 120s: linear drop from +120% to 0%
  // At 1s = +1.2 (120% bonus), at 120s = 0 (no bonus)
  if (elapsedSeconds <= 120) {
    // Linear interpolation: 1.2 at 1s, 0 at 120s
    const progress = (elapsedSeconds - 1) / (120 - 1); // 0 at 1s, 1 at 120s
    return 1.2 * (1 - progress);
  }

  // From 120s to 300s (5 min): no bonus, no penalty
  if (elapsedSeconds <= 300) {
    return 0;
  }

  // After 5 min: start penalty
  // Drop 0.1 every 30s after 5 min, capped at -0.5 (50% penalty)
  const secondsAfter5min = elapsedSeconds - 300;
  const penaltySteps = Math.floor(secondsAfter5min / 30) + 1;
  const penalty = -0.1 * penaltySteps;
  return Math.max(-0.5, penalty);
}

function clampTimeBonus(bonus: number): number {
  if (!Number.isFinite(bonus)) return 0;
  return Math.min(Math.max(bonus, -0.5), 1.2);
}
