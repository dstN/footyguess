import type { Difficulty } from "./difficulty.ts";

export interface ScoreBreakdown {
  base: number;
  multiplier: number;
  /** Base × multiplier */
  adjustedBase: number;
  /** Streak bonus multiplier (e.g., 0.1 = +10%) */
  streakBonus: number;
  /** Streak bonus points (additive on adjustedBase) */
  streakBonusPoints: number;
  /** No-clue bonus (+10% of adjustedBase if 0 clues) */
  noClueBonus: number;
  /** Clue penalty (-6% of adjustedBase per clue, max -30%) */
  cluePenalty: number;
  cluesUsed: number;
  /** No-malice bonus (+10% of adjustedBase if 0 wrong guesses) */
  noMaliceBonus: number;
  /** Malice penalty (-6% of adjustedBase per wrong guess, max -30%) */
  malicePenalty: number;
  missedGuesses: number;
  /** Time bonus/penalty (% of adjustedBase, capped at -30% min) */
  timeBonus: number;
  /** Time bonus/penalty points */
  timeBonusPoints: number;
  /** Final round score */
  roundScore: number;
  /** Same as roundScore */
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

/**
 * Penalty percentage per clue/wrong guess (6% = 0.06)
 * 5 × 6% = 30% max penalty
 */
const PENALTY_PER_CLUE = 0.06;
const PENALTY_PER_WRONG = 0.06;
const MAX_PENALTY = 0.3;

/**
 * Calculate score with ALL ADDITIVE formula (on base × multiplier):
 *
 * score = adjustedBase
 *       + streakBonus (% of adjustedBase)
 *       + noClueBonus (+10% if 0 clues) OR cluePenalty (-6% per clue, max -30%)
 *       + noMaliceBonus (+10% if 0 wrong) OR malicePenalty (-6% per wrong, max -30%)
 *       + timeBonus (% of adjustedBase, max -30% penalty)
 *
 * MAX PENALTY: -30% each = -90% total, so minimum score = 10% of adjustedBase
 */
export function calculateScore(
  difficulty: Difficulty,
  cluesUsed: number,
  streak: number,
  opts: {
    elapsedSeconds?: number;
    missedGuesses?: number;
    graceSeconds?: number; // Time freeze grace period
  } = {},
): ScoreBreakdown {
  const basePoints = difficulty.basePoints;
  const multiplier = difficulty.multiplier;
  const missedGuesses = opts.missedGuesses ?? 0;
  const graceSeconds = opts.graceSeconds ?? 0;

  // Step 1: Base × multiplier
  const adjustedBase = basePoints * multiplier;

  // All bonuses/penalties are additive percentages of adjustedBase
  // PENALTIES ARE CAPPED AT -30% EACH

  // Streak bonus: +5% to +30%
  const streakBonus = getStreakBonusMultiplier(streak);
  const streakBonusPoints = Math.round(adjustedBase * streakBonus);

  // Clue bonus/penalty:
  // - 0 clues = +10% bonus
  // - 1+ clues = -6% per clue, CAPPED AT -30%
  const noClueBonus = cluesUsed === 0 ? Math.round(adjustedBase * 0.1) : 0;
  const clueRawPenalty =
    cluesUsed > 0 ? Math.min(MAX_PENALTY, PENALTY_PER_CLUE * cluesUsed) : 0;
  const cluePenalty = Math.round(adjustedBase * clueRawPenalty);

  // Malice bonus/penalty:
  // - 0 wrong guesses = +10% bonus
  // - 1+ wrong guesses = -6% per wrong guess, CAPPED AT -30%
  const noMaliceBonus =
    missedGuesses === 0 ? Math.round(adjustedBase * 0.1) : 0;
  const maliceRawPenalty =
    missedGuesses > 0
      ? Math.min(MAX_PENALTY, PENALTY_PER_WRONG * missedGuesses)
      : 0;
  const malicePenalty = Math.round(adjustedBase * maliceRawPenalty);

  // Time bonus/penalty (on adjustedBase):
  // Subtract grace period from elapsed time before calculating
  // PENALTY CAPPED AT -30%
  const effectiveElapsed = Math.max(
    0,
    (opts.elapsedSeconds ?? 0) - graceSeconds,
  );
  const hasElapsed =
    opts.elapsedSeconds !== undefined && opts.elapsedSeconds !== null;
  const rawTimeBonus = hasElapsed ? getTimeBonus(effectiveElapsed) : 0;
  const timeBonus = Math.max(-MAX_PENALTY, rawTimeBonus); // Cap penalty at -30%
  const timeBonusPoints = Math.round(adjustedBase * timeBonus);

  // Final score = sum of all
  // Worst case: adjustedBase - 30% - 30% - 30% = 10% of adjustedBase
  // Minimum 1 point for a correct guess
  const roundScore = Math.max(
    adjustedBase +
      streakBonusPoints +
      noClueBonus -
      cluePenalty +
      noMaliceBonus -
      malicePenalty +
      timeBonusPoints,
    1, // Minimum 1 point for correct guess
  );

  return {
    base: basePoints,
    multiplier,
    adjustedBase,
    streakBonus,
    streakBonusPoints,
    noClueBonus,
    cluePenalty,
    cluesUsed,
    noMaliceBonus,
    malicePenalty,
    missedGuesses,
    timeBonus,
    timeBonusPoints,
    roundScore,
    finalScore: roundScore,
  };
}

/**
 * Time bonus/penalty calculation:
 * - 0-1s: +120% (instant guess)
 * - 1-120s: Linear drop from +120% to 0%
 * - 120-300s (2-5 min): 0% (no bonus, no penalty)
 * - 300-600s (5-10 min): -6% per 60 seconds (5 intervals = -30% at 10 min)
 * - 600s+: Capped at -30% (in calculateScore)
 */
export function getTimeBonus(elapsedSeconds?: number): number {
  if (elapsedSeconds === undefined || elapsedSeconds === null) return 0;

  // First second: max bonus (instant guess)
  if (elapsedSeconds <= 1) return 1.2;

  // From 1s to 120s: linear drop from +120% to 0%
  if (elapsedSeconds <= 120) {
    const progress = (elapsedSeconds - 1) / (120 - 1);
    return 1.2 * (1 - progress);
  }

  // From 120s to 300s (5 min): no bonus, no penalty
  if (elapsedSeconds <= 300) return 0;

  // After 5 min: -0.1% per second, max -30%
  // 30% / 0.1% = 300 seconds = 5 minutes to max out
  // Max penalty reached at 10 minutes (5 min + 5 min)
  const secondsAfter5min = elapsedSeconds - 300;
  const penalty = 0.001 * secondsAfter5min; // 0.1% = 0.001
  return -1 * Math.min(0.3, penalty);
}
