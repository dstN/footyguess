/**
 * Scoring constants - shared between server and client
 * Used for displaying scoring rules in HelpModal and calculating scores
 */

/**
 * Base points for a correct guess before multipliers
 */
export const BASE_POINTS = 100;

/**
 * Percentage deducted per clue used (6% = 0.06)
 * 5 clues × 6% = 30% max penalty
 */
export const CLUE_PENALTY = 0.06;

/**
 * Difficulty multipliers by tier
 * Updated v1.3.0: Changed from (1.0, 1.25, 1.5, 2.0) to (1, 2, 3, 4)
 * for more meaningful scoring differentiation between tiers
 */
export const DIFFICULTY_MULTIPLIERS = {
  easy: 1,
  medium: 2,
  hard: 3,
  ultra: 4,
} as const;

/**
 * Maximum points by tier (BASE_POINTS * multiplier)
 */
export const MAX_POINTS_BY_TIER = {
  easy: 100,
  medium: 200,
  hard: 300,
  ultra: 400,
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
  /** Penalty per second (0.1% = 0.001) */
  penaltyPerSecond: 0.001,
  /** Maximum penalty (30% = 0.3) */
  maxPenalty: 0.3,
} as const;

/**
 * Malice penalty (wrong guesses)
 * v1.4.2: Changed from -10% to -6% per wrong guess
 * Max 5 wrong guesses allowed before round abort (5 × 6% = 30% max)
 */
export const MALICE_PENALTY = {
  /** Penalty per wrong guess (-6% = -0.06) */
  perGuess: 0.06,
  /** Maximum penalty (5 wrong guesses × 6% = 30%) */
  max: 0.3,
} as const;

/**
 * Maximum wrong guesses allowed before round abort
 * 6th wrong guess = instant loss (score = 0)
 */
export const MAX_WRONG_GUESSES = 5;

/**
 * Grace period: time freeze before time bonus starts counting
 * v1.4.2: 5s per player transfer, capped at 30s
 */
export const GRACE_SECONDS_PER_TRANSFER = 5;
export const MAX_GRACE_SECONDS = 30;

/**
 * Penalty cap: maximum penalty for clues, malice, and time is -30% each
 * This ensures minimum score of 10% (e.g., 10 pts on Easy, 40 pts on Ultra)
 */
export const MAX_PENALTY_PERCENT = 0.3;
