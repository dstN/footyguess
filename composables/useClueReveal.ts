import { ref, type Ref } from "vue";
import type { Player } from "~/types/player";
import { useCluePool } from "~/composables/useCluePool";
import { logError } from "~/utils/client-logger";

/**
 * Round state interface for clue tracking
 */
interface RoundState {
  id: string;
  token: string;
  sessionId: string;
  expiresAt: number;
  cluesUsed: number;
}

/**
 * Toast interface for feedback
 */
interface Toast {
  add: (options: {
    title: string;
    description: string;
    color: string;
    icon: string;
  }) => void;
}

/**
 * Manages clue reveal with server synchronization
 * Combines clue pool state management with API sync
 *
 * @example
 * ```ts
 * const { revealedClues, revealClue, tipButtonDisabled } = useClueReveal(player, round, toast, errorMessage);
 * await revealClue(); // Reveals next clue and syncs with server
 * ```
 */
export function useClueReveal(
  player: Ref<Player | null>,
  round: Ref<RoundState | null>,
  toast: Toast,
  errorMessage: Ref<string>,
  isLoading: Ref<boolean>,
) {
  // Delegate to clue pool for state management
  const {
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    selectRandomClues,
    revealNextClue: revealNextClueLocal,
  } = useCluePool(player, { isLoading });

  /**
   * Reveal next clue with server synchronization
   * Updates server clue count, then reveals locally
   */
  async function revealClue() {
    if (!round.value) return;

    try {
      const res = await $fetch<{ cluesUsed: number }>("/api/useClue", {
        method: "POST",
        body: { roundId: round.value.id, token: round.value.token },
      });

      if (res?.cluesUsed !== undefined) {
        round.value = { ...round.value, cluesUsed: res.cluesUsed };
      }

      errorMessage.value = ""; // Clear error on success
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reveal clue";
      errorMessage.value = message;
      logError("useClueReveal", "Failed to record clue", err);
      toast.add({
        title: "Clue error",
        description: message,
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
      throw err;
    }

    revealNextClueLocal();
  }

  return {
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    selectRandomClues,
    revealClue,
  };
}
