import { ref, type Ref } from "vue";

/**
 * Manages player reset flow with streak confirmation
 * Handles the "new player" confirmation modal when a streak is active
 *
 * @example
 * ```ts
 * const { confirmOpen, request, confirm, cancel } = usePlayerReset(streak, resetStreak, loadPlayer);
 * request("Messi"); // Shows confirmation if streak > 0, otherwise loads directly
 * ```
 */
export function usePlayerReset(
  streak: Ref<number>,
  resetStreak: () => void,
  loadPlayer: (name?: string) => Promise<void>,
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
   * Confirm new player request
   * Resets streak and loads the pending player
   */
  function confirm() {
    resetStreak();
    confirmOpen.value = false;
    loadPlayer(pendingName.value);
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
