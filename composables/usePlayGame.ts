import { computed, inject, onMounted, reactive, ref } from "vue";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player } from "~/types/player";
import type { GuessFormState, GuessFormOutput } from "~/types/forms";
import { GuessFormSchema } from "~/types/forms";
import { useGameSession } from "~/composables/useGameSession";
import { useGuessSubmission } from "~/composables/useGuessSubmission";
import { useGameStreak } from "~/composables/useGameStreak";
import { useClueReveal } from "~/composables/useClueReveal";
import { usePlayerReset } from "~/composables/usePlayerReset";
import { usePlayerSearch } from "~/composables/usePlayerSearch";
import { useTransferTimeline } from "~/composables/useTransferTimeline";

/**
 * Main game composable that orchestrates all game logic
 * Coordinates session management, guess submission, streak tracking, and clue system
 *
 * This is a thin orchestration layer that delegates to focused sub-composables:
 * - useGameSession: Session and round state
 * - useGuessSubmission: Guess validation and submission
 * - useGameStreak: Streak tracking and persistence
 * - useClueReveal: Clue pool and server sync
 * - usePlayerReset: New player confirmation flow
 * - usePlayerSearch: Search autocomplete
 * - useTransferTimeline: Career timeline display
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

  // === Session & Player State ===
  const {
    sessionId,
    player,
    round,
    currentName,
    isLoading,
    errorMessage,
    isError,
    loadPlayer: loadPlayerSession,
    resetSessionId,
  } = useGameSession();

  // === Streak Management ===
  const {
    streak,
    bestStreak,
    loadStreakFromStorage,
    resetStreak,
    updateStreak,
  } = useGameStreak();

  // === Form State ===
  const schema = GuessFormSchema;
  const formState = reactive<GuessFormState>({
    guess: "",
  });
  const hasGuess = computed(() => formState.guess.trim().length > 0);

  // === Search ===
  const { searchTerm, suggestions, onSearch, clearSearch } = usePlayerSearch();

  // === Timeline ===
  const { careerTimeline } = useTransferTimeline(player);

  // === Clue Reveal ===
  const {
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    selectRandomClues,
    revealClue,
  } = useClueReveal(player, round, toast, errorMessage, isLoading);

  // === Computed from player ===
  const difficulty = computed(() => player.value?.difficulty ?? null);
  const maxBasePoints = computed(() =>
    difficulty.value
      ? Math.round(difficulty.value.basePoints * difficulty.value.multiplier)
      : 0,
  );

  // === Player Loading ===
  /**
   * Load player with form reset and clue selection
   */
  async function loadPlayer(name?: string) {
    await loadPlayerSession(name);
    formState.guess = "";
    clearSearch();
    selectRandomClues();
  }

  // === Player Reset ===
  const {
    confirmOpen: confirmResetOpen,
    request: requestNewPlayer,
    confirm: confirmNewPlayer,
    cancel: cancelNewPlayer,
  } = usePlayerReset(streak, resetStreak, loadPlayer);

  // === Form Input Handling ===
  /**
   * Clear error when user starts typing
   */
  function onGuessInput() {
    if (isError.value) {
      isError.value = false;
      errorMessage.value = "";
    }
  }

  function clearGuess() {
    formState.guess = "";
    clearSearch();
  }

  // === Guess Handlers ===
  /**
   * Persist last player to localStorage
   */
  function persistLastPlayer(name: string) {
    if (import.meta.client) {
      localStorage.setItem("footyguess_last_player", name);
    }
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
    formState.guess = "";
    clearSearch();
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

  // === Surrender ===
  async function giveUp() {
    if (!player.value || !round.value) return;
    isLoading.value = true;
    try {
      const res = await $fetch<{
        ok: boolean;
        playerName: string;
        playerTmUrl: string | null;
      }>("/api/surrender", {
        method: "POST",
        body: { roundId: round.value.id, token: round.value.token },
      });

      persistLastPlayer(res.playerName);
      router.push({ path: "/won", query: { surrendered: "true" } });
    } catch (e) {
      handleGuessError("Failed to surrender round.");
    } finally {
      isLoading.value = false;
    }
  }

  // === Guess Submission ===
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

  // === Lifecycle ===
  onMounted(async () => {
    loadStreakFromStorage();
    await loadPlayer();
  });

  // === Public API ===
  return {
    // Form
    schema,
    formState,
    hasGuess,
    onGuessInput,
    clearGuess,

    // Player/Round
    player,
    currentName,
    isLoading,
    errorMessage,
    isError,
    difficulty,
    maxBasePoints,

    // Clues
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    revealNextClue: revealClue,

    // Timeline
    careerTimeline,

    // Search
    suggestions,
    searchTerm,
    onSearch,

    // Streak
    streak,
    bestStreak,

    // Player Reset
    confirmResetOpen,
    loadPlayer,
    requestNewPlayer,
    confirmNewPlayer: () => {
      resetSessionId();
      confirmNewPlayer();
    },
    cancelNewPlayer,

    // Guess
    submitGuessViaEnter,
    onSubmit,
    giveUp,
  };
}
