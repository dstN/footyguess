import { ref } from "vue";
import type { UserSelectedDifficulty } from "~/types/player";

/**
 * Manages player streak state and persistence
 * Handles current streak, best streak, and localStorage synchronization
 * Tracks difficulty to prevent cross-difficulty streak exploitation
 *
 * @example
 * ```ts
 * const { streak, bestStreak, resetStreak, saveStreak, loadStreakFromStorage, shouldResetStreakForDifficulty } = useGameStreak();
 * loadStreakFromStorage();
 * if (shouldResetStreakForDifficulty('hard')) {
 *   resetStreak();
 * }
 * saveStreak();
 * ```
 */
export function useGameStreak() {
  const streak = ref(0);
  const bestStreak = ref(0);
  const streakDifficulty = ref<UserSelectedDifficulty | null>(null);

  /**
   * Loads streak values from browser localStorage
   */
  function loadStreakFromStorage() {
    if (!import.meta.client) return;
    const stored = Number.parseInt(
      localStorage.getItem("footyguess_streak") || "0",
      10,
    );
    const storedBest = Number.parseInt(
      localStorage.getItem("footyguess_best_streak") || "0",
      10,
    );
    const storedDifficulty = localStorage.getItem(
      "footyguess_streak_difficulty",
    ) as UserSelectedDifficulty | null;

    streak.value = Number.isFinite(stored) ? stored : 0;
    bestStreak.value = Number.isFinite(storedBest) ? storedBest : 0;
    streakDifficulty.value = storedDifficulty;
  }

  /**
   * Persists current streak values to localStorage
   */
  function saveStreak() {
    if (!import.meta.client) return;
    localStorage.setItem("footyguess_streak", String(streak.value));
    localStorage.setItem("footyguess_best_streak", String(bestStreak.value));
    if (streakDifficulty.value) {
      localStorage.setItem(
        "footyguess_streak_difficulty",
        streakDifficulty.value,
      );
    } else {
      localStorage.removeItem("footyguess_streak_difficulty");
    }
  }

  /**
   * Resets current streak to 0 and saves to storage
   */
  function resetStreak() {
    streak.value = 0;
    streakDifficulty.value = null;
    saveStreak();
  }

  /**
   * Updates streak values and saves to storage
   * @param {number} newStreak - New streak value
   * @param {number} newBestStreak - New best streak value
   * @param {UserSelectedDifficulty} difficulty - User-selected difficulty mode (e.g., 'default', 'hard')
   */
  function updateStreak(
    newStreak: number,
    newBestStreak: number,
    difficulty?: UserSelectedDifficulty,
  ) {
    streak.value = newStreak;
    bestStreak.value = newBestStreak;
    if (difficulty) {
      streakDifficulty.value = difficulty;
    }
    saveStreak();
  }

  /**
   * Checks if streak should be reset due to difficulty change
   * @param {string} newDifficulty - The difficulty being switched to (can be UserSelectedDifficulty or DifficultyTier)
   * @returns {boolean} True if streak should be reset
   */
  function shouldResetStreakForDifficulty(newDifficulty: string): boolean {
    return (
      streak.value > 0 &&
      streakDifficulty.value !== null &&
      streakDifficulty.value !== newDifficulty
    );
  }

  return {
    streak,
    bestStreak,
    streakDifficulty,
    loadStreakFromStorage,
    saveStreak,
    resetStreak,
    updateStreak,
    shouldResetStreakForDifficulty,
  };
}
