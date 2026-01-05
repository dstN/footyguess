import { computed, inject, onMounted, reactive, ref } from "vue";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player } from "~/types/player";
import type { GuessFormState, GuessFormOutput } from "~/types/forms";
import { GuessFormSchema } from "~/types/forms";
import { useGameSession } from "~/composables/useGameSession";
import { useGuessSubmission } from "~/composables/useGuessSubmission";
import { useGameStreak } from "~/composables/useGameStreak";
import { useCluePool } from "~/composables/useCluePool";
import { usePlayerSearch } from "~/composables/usePlayerSearch";
import { useTransferTimeline } from "~/composables/useTransferTimeline";
import { sanitizeText } from "~/utils/sanitize";

/**
 * Main game composable that orchestrates all game logic
 * Coordinates session management, guess submission, streak tracking, and clue system
 *
 * @example
 * ```ts
 * const gameState = usePlayGame();
 * // Access player data, form state, game methods
 * ```
 */
export function usePlayGame() {
  const router = useRouter();
  const toast = useToast();
  const triggerShake = inject<() => void>("triggerShake");

  // Composable orchestration
  const {
    sessionId,
    player,
    round,
    currentName,
    isLoading,
    errorMessage,
    isError,
    loadPlayer: loadPlayerSession,
  } = useGameSession();

  const {
    streak,
    bestStreak,
    loadStreakFromStorage,
    resetStreak,
    updateStreak,
  } = useGameStreak();

  // Form and UI state
  const schema = GuessFormSchema;
  const formState = reactive<GuessFormState>({
    guess: "",
  });

  const confirmResetOpen = ref(false);
  const pendingName = ref<string | undefined>(undefined);

  const hasGuess = computed(() => formState.guess.trim().length > 0);

  // Clear error when user starts typing
  const onGuessInput = () => {
    if (isError.value) {
      isError.value = false;
      errorMessage.value = "";
    }
  };

  // Dependent composables
  const { searchTerm, suggestions, onSearch, clearSearch } = usePlayerSearch();
  const { careerTimeline } = useTransferTimeline(player);
  const {
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    selectRandomClues,
    revealNextClue,
  } = useCluePool(player, { isLoading });

  const difficulty = computed(() => player.value?.difficulty ?? null);
  const maxBasePoints = computed(() =>
    difficulty.value
      ? Math.round(difficulty.value.basePoints * difficulty.value.multiplier)
      : 0,
  );

  /**
   * Load player wrapper that also resets form and clues
   */
  async function loadPlayer(name?: string) {
    await loadPlayerSession(name);
    formState.guess = "";
    clearSearch();
    selectRandomClues();
  }

  /**
   * Persist last player to localStorage
   */
  function persistLastPlayer(name: string) {
    if (import.meta.client) {
      localStorage.setItem("footyguess_last_player", sanitizeText(name));
    }
  }

  /**
   * Reveal next clue with server synchronization
   */
  async function revealNextClueWithServer() {
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
      if (import.meta.dev) console.error("Failed to record clue", err);
      toast.add({
        title: "Clue error",
        description: message,
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
      throw err;
    }
    revealNextClue();
  }

  /**
   * Handle correct guess - navigate to results
   */
  function handleCorrectGuess(
    playerName: string,
    difficulty: Player["difficulty"],
    breakdown: any,
    score: number,
    newStreak: number,
  ) {
    isError.value = false;
    persistLastPlayer(playerName);
    toast.add({
      title: `Correct! +${breakdown.preStreak} base pts`,
      description: `Time: +${Math.round((breakdown.timeMultiplier - 1) * 100)}% · Streak: ${Math.round(breakdown.streakBonus * 100)}% → total ${score} pts · Streak ${newStreak}`,
      color: "primary",
      icon: "i-lucide-party-popper",
    });
    router.push("/won");
  }

  /**
   * Handle incorrect guess - trigger shake and error message
   */
  function handleIncorrectGuess() {
    isError.value = true;
    errorMessage.value = "Incorrect guess - follow the clues more carefully";
    toast.add({
      title: "Wrong player",
      description: "Try again - follow the clues.",
      color: "error",
      icon: "i-lucide-x-circle",
    });
    triggerShake?.();
  }

  /**
   * Handle guess submission error
   */
  function handleGuessError(message: string) {
    errorMessage.value = message;
    isError.value = true;
    toast.add({
      title: "Guess failed",
      description: message,
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  }

  const { submitGuess, onSubmit, submitGuessViaEnter } = useGuessSubmission(
    player,
    round,
    streak,
    bestStreak,
    updateStreak,
    handleCorrectGuess,
    handleIncorrectGuess,
    handleGuessError,
  );

  function clearGuess() {
    formState.guess = "";
    clearSearch();
  }

  function requestNewPlayer(name?: string) {
    if (streak.value > 0) {
      pendingName.value = name;
      confirmResetOpen.value = true;
      return;
    }
    loadPlayer(name);
  }

  function confirmNewPlayer() {
    resetStreak();
    confirmResetOpen.value = false;
    loadPlayer(pendingName.value);
    pendingName.value = undefined;
  }

  function cancelNewPlayer() {
    confirmResetOpen.value = false;
    pendingName.value = undefined;
  }

  onMounted(async () => {
    loadStreakFromStorage();
    await loadPlayer();
  });

  return {
    schema,
    formState,
    hasGuess,
    player,
    currentName,
    isLoading,
    errorMessage,
    isError,
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    careerTimeline,
    suggestions,
    searchTerm,
    streak,
    bestStreak,
    difficulty,
    maxBasePoints,
    confirmResetOpen,
    loadPlayer,
    requestNewPlayer,
    confirmNewPlayer,
    cancelNewPlayer,
    revealNextClue: revealNextClueWithServer,
    onSearch,
    onGuessInput,
    submitGuessViaEnter,
    onSubmit,
    clearGuess,
  };
}
