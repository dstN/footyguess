import { ref } from "vue";

/**
 * Manages player streak state and persistence
 * Handles current streak, best streak, and localStorage synchronization
 *
 * @example
 * ```ts
 * const { streak, bestStreak, resetStreak, saveStreak, loadStreakFromStorage } = useGameStreak();
 * loadStreakFromStorage();
 * saveStreak();
 * ```
 */
export function useGameStreak() {
  const streak = ref(0);
  const bestStreak = ref(0);

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
    streak.value = Number.isFinite(stored) ? stored : 0;
    bestStreak.value = Number.isFinite(storedBest) ? storedBest : 0;
  }

  /**
   * Persists current streak values to localStorage
   */
  function saveStreak() {
    if (!import.meta.client) return;
    localStorage.setItem("footyguess_streak", String(streak.value));
    localStorage.setItem("footyguess_best_streak", String(bestStreak.value));
  }

  /**
   * Resets current streak to 0 and saves to storage
   */
  function resetStreak() {
    streak.value = 0;
    saveStreak();
  }

  /**
   * Updates streak values and saves to storage
   * @param {number} newStreak - New streak value
   * @param {number} newBestStreak - New best streak value
   */
  function updateStreak(newStreak: number, newBestStreak: number) {
    streak.value = newStreak;
    bestStreak.value = newBestStreak;
    saveStreak();
  }

  return {
    streak,
    bestStreak,
    loadStreakFromStorage,
    saveStreak,
    resetStreak,
    updateStreak,
  };
}
