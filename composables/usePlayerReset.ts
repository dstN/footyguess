import { ref, type Ref } from "vue";
import type { UserSelectedDifficulty } from "~/types/player";

/**
 * Options for loading a player
 */
interface LoadPlayerOptions {
  name?: string;
  difficulty?: UserSelectedDifficulty;
}

/**
 * Manages player reset flow with streak confirmation
 * Handles the "new player" confirmation modal when a streak is active
 *
 * @example
 * ```ts
 * const { confirmOpen, request, confirm, cancel } = usePlayerReset(streak, resetStreak, loadPlayer, currentDifficulty);
 * request("Messi"); // Shows confirmation if streak > 0, otherwise loads directly
 * ```
 */
export function usePlayerReset(
  streak: Ref<number>,
  resetStreak: () => void,
  loadPlayer: (options?: LoadPlayerOptions | string) => Promise<void>,
  currentDifficulty: Ref<UserSelectedDifficulty>,
  shouldResetStreakForDifficulty?: (difficulty: string) => boolean,
) {
  const confirmOpen = ref(false);
  const pendingName = ref<string | undefined>(undefined);

  /**
   * Request a new player
   * If streak is active, shows confirmation modal
   * Otherwise loads player directly
   */
  function request(name?: string) {
    if (streak.value > 0) {
      pendingName.value = name;
      confirmOpen.value = true;
      return;
    }
    loadPlayer(name);
  }

  /**
   * Confirm new player request with optional difficulty selection
   * Resets streak if difficulty changed or if user confirmed streak reset
   * @param difficulty - Optional difficulty to use for the new player
   */
  function confirm(difficulty?: UserSelectedDifficulty) {
    // Reset streak ONLY if difficulty changed (not just because user has an active streak)
    const shouldResetDueToDifficulty =
      difficulty && shouldResetStreakForDifficulty?.(difficulty);
    if (shouldResetDueToDifficulty) {
      resetStreak();
    }

    confirmOpen.value = false;

    // Build options based on pending name and selected difficulty
    const options: LoadPlayerOptions = {};
    if (pendingName.value) {
      options.name = pendingName.value;
    }
    if (difficulty) {
      options.difficulty = difficulty;
    }

    loadPlayer(Object.keys(options).length > 0 ? options : undefined);
    pendingName.value = undefined;
  }

  /**
   * Cancel new player request
   * Closes modal without changes
   */
  function cancel() {
    confirmOpen.value = false;
    pendingName.value = undefined;
  }

  return {
    confirmOpen,
    request,
    confirm,
    cancel,
  };
}
