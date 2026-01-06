/**
 * Scoring constants - shared between server and client
 * Used for displaying scoring rules in HelpModal and calculating scores
 */

/**
 * Base points for a correct guess before multipliers
 */
export const BASE_POINTS = 100;

/**
 * Points deducted per clue used
 */
export const CLUE_PENALTY = 10;

/**
 * Difficulty multipliers by tier
 */
export const DIFFICULTY_MULTIPLIERS = {
  easy: 1.0,
  medium: 1.25,
  hard: 1.5,
  ultra: 2.0,
} as const;

/**
 * Maximum points by tier (BASE_POINTS * multiplier)
 */
export const MAX_POINTS_BY_TIER = {
  easy: 100,
  medium: 125,
  hard: 150,
  ultra: 200,
} as const;

/**
 * Streak bonus thresholds and percentages
 */
export const STREAK_BONUSES = [
  { threshold: 100, bonus: 0.3 },
  { threshold: 60, bonus: 0.2 },
  { threshold: 30, bonus: 0.15 },
  { threshold: 15, bonus: 0.1 },
  { threshold: 5, bonus: 0.05 },
] as const;

/**
 * Time bonus configuration
 */
export const TIME_BONUS = {
  /** Maximum bonus for instant guesses */
  maxBonus: 1.2,
  /** Time in seconds for max bonus */
  instantThreshold: 1,
  /** Time when bonus drops to 0 */
  zeroBonusTime: 120,
  /** Time when penalty starts */
  penaltyStartTime: 300,
  /** Penalty per 30 seconds */
  penaltyPerStep: 0.1,
  /** Maximum penalty */
  maxPenalty: 0.5,
} as const;

/**
 * Malice penalty (wrong guesses)
 */
export const MALICE_PENALTY = {
  /** Penalty per wrong guess */
  perGuess: 0.02,
  /** Maximum penalty */
  max: 0.5,
} as const;
