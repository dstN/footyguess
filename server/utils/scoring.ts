import type { Difficulty } from "./difficulty";

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
  opts: { elapsedSeconds?: number; floor?: number } = {},
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
  const timeMultiplier = clampTimeMultiplier(getTimeMultiplier(opts.elapsedSeconds));

  const timeAdjusted = Math.max(preStreak * timeMultiplier, preStreak * 0.1, floor);
  const timeScore = Math.round(timeAdjusted);
  const finalScore = Math.round(timeScore * (1 + streakBonus));

  return {
    base: basePoints,
    multiplier,
    timeMultiplier,
    cluesUsed,
    cluePenalty,
    preStreak,
    timeScore,
    streakBonus,
    finalScore,
  };
}

export function getTimeMultiplier(elapsedSeconds?: number) {
  if (elapsedSeconds === undefined || elapsedSeconds === null) return 1;
  if (elapsedSeconds <= 30) return 1.25;
  if (elapsedSeconds <= 60) return 1.1;
  if (elapsedSeconds <= 120) return 1;
  // after 120s, drop 0.1 every 30s, capped at 0.1 min
  const steps = Math.floor((elapsedSeconds - 120) / 30) + 1;
  const mult = 1 - 0.1 * steps;
  return Math.max(0.1, mult);
}

function clampTimeMultiplier(mult: number) {
  if (!Number.isFinite(mult)) return 1;
  return Math.min(Math.max(mult, 0.1), 1.25);
}
