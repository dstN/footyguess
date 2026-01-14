import { computed, inject, onMounted, reactive, ref } from "vue";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player, UserSelectedDifficulty } from "~/types/player";
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
 * Options for loading a player in the game
 */
interface LoadPlayerOptions {
  /** Player name (for specific player) */
  name?: string;
  /** Difficulty filter for random player */
  difficulty?: UserSelectedDifficulty;
}

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
  const route = useRoute();
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
    selectedDifficulty,
    loadPlayer: loadPlayerSession,
    resetSessionId,
  } = useGameSession();

  // === Streak Management ===
  const {
    streak,
    bestStreak,
    streakDifficulty,
    loadStreakFromStorage,
    resetStreak,
    updateStreak,
    shouldResetStreakForDifficulty,
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
  // Live score data from round
  const roundStartedAt = computed(() => round.value?.startedAt ?? 0);
  const transferCount = computed(() => round.value?.transferCount ?? 0);
  // Clues used from useClueReveal
  const cluesUsed = computed(() => revealedClues.value?.length ?? 0);

  // === Difficulty Persistence ===
  /**
   * Persist difficulty to localStorage for "New Mystery" continuity
   */
  function persistDifficulty(diff: UserSelectedDifficulty) {
    if (import.meta.client) {
      localStorage.setItem("footyguess_difficulty", diff);
    }
  }

  /**
   * Load difficulty from localStorage
   */
  function loadPersistedDifficulty(): UserSelectedDifficulty | null {
    if (import.meta.client) {
      const stored = localStorage.getItem("footyguess_difficulty");
      if (
        stored &&
        ["default", "easy", "medium", "hard", "ultra"].includes(stored)
      ) {
        return stored as UserSelectedDifficulty;
      }
    }
    return null;
  }

  // === Player Loading ===
  /**
   * Load player with form reset and clue selection
   * @param options - Either player name string or options object with name/difficulty
   */
  async function loadPlayer(options?: LoadPlayerOptions | string) {
    // Handle backwards compatibility: loadPlayer("name") -> loadPlayer({ name: "name" })
    const opts: LoadPlayerOptions =
      typeof options === "string" ? { name: options } : (options ?? {});

    // Persist difficulty when explicitly provided
    if (opts.difficulty) {
      persistDifficulty(opts.difficulty);
    }

    await loadPlayerSession(opts);
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
  } = usePlayerReset(
    streak,
    resetStreak,
    loadPlayer,
    selectedDifficulty,
    shouldResetStreakForDifficulty,
  );

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
    const timeBonusPct = Math.round((breakdown.timeBonus ?? 0) * 100);
    toast.add({
      title: `Correct! +${breakdown.adjustedBase} base pts`,
      description: `Time: ${timeBonusPct >= 0 ? "+" : ""}${timeBonusPct}% · Streak: ${Math.round((breakdown.streakBonus ?? 0) * 100)}% → total ${score} pts · Streak ${newStreak}`,
      color: "primary",
      icon: "i-lucide-party-popper",
    });
    router.push({ path: "/won", query: { reason: "win" } });
  }

  /**
   * Handle incorrect guess - trigger shake and error message
   */
  function handleIncorrectGuess(wrongGuessCount?: number) {
    formState.guess = "";
    clearSearch();
    isError.value = true;
    // 6th wrong guess triggers abort, so remaining = 6 - count
    const remaining = 6 - (wrongGuessCount ?? 0);
    errorMessage.value =
      remaining <= 2
        ? `Wrong! Only ${remaining} guess${remaining === 1 ? "" : "es"} left before round loss!`
        : "Incorrect guess - follow the clues more carefully";
    toast.add({
      title: "Wrong player",
      description:
        remaining <= 2
          ? `⚠️ ${remaining} guess${remaining === 1 ? "" : "es"} remaining!`
          : "Try again - follow the clues.",
      color: "error",
      icon: "i-lucide-x-circle",
    });
    triggerShake?.();
  }

  /**
   * Handle round abort (too many wrong guesses)
   */
  function handleAborted(playerName: string) {
    persistLastPlayer(playerName);
    toast.add({
      title: "Round lost!",
      description: "Too many wrong guesses. Better luck next time!",
      color: "error",
      icon: "i-lucide-skull",
    });
    router.push({ path: "/won", query: { reason: "aborted" } });
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
      router.push({ path: "/won", query: { reason: "surrender" } });
    } catch (e) {
      handleGuessError("Failed to surrender round.");
    } finally {
      isLoading.value = false;
    }
  }

  // === Guess Submission ===
  const { submitGuess, onSubmit, submitGuessViaEnter, wrongGuessCount } =
    useGuessSubmission(
      player,
      round,
      streak,
      bestStreak,
      selectedDifficulty,
      updateStreak,
      handleCorrectGuess,
      handleIncorrectGuess,
      handleGuessError,
      handleAborted,
    );

  // === Lifecycle ===
  onMounted(async () => {
    loadStreakFromStorage();

    // Check for difficulty from query param (from index.vue navigation)
    const queryDifficulty = route.query.difficulty as
      | UserSelectedDifficulty
      | undefined;
    const isNewGame = route.query.newGame === "true";
    const validDifficulties: UserSelectedDifficulty[] = [
      "default",
      "easy",
      "medium",
      "hard",
      "ultra",
    ];

    // If explicitly starting a new game, reset everything
    if (isNewGame) {
      resetSessionId();
      resetStreak();
    }
    // If continuing streak, do NOT reset anything
    // (route.query.continueStreak === "true" means keep streak/session)

    if (queryDifficulty && validDifficulties.includes(queryDifficulty)) {
      await loadPlayer({ difficulty: queryDifficulty });
      // Clear the query param after loading (optional, keeps URL clean)
      router.replace({ query: {} });
    } else {
      // Try to load persisted difficulty (from previous game / "New Mystery")
      const persistedDifficulty = loadPersistedDifficulty();
      if (persistedDifficulty) {
        await loadPlayer({ difficulty: persistedDifficulty });
      } else {
        await loadPlayer();
      }
    }
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
    selectedDifficulty,

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

    // Wrong guess tracking
    wrongGuessCount,

    // Live score data
    roundStartedAt,
    transferCount,
    cluesUsed,

    // Difficulty persistence
    loadPersistedDifficulty,

    // Player Reset
    confirmResetOpen,
    loadPlayer,
    requestNewPlayer,
    confirmNewPlayer: (difficulty?: UserSelectedDifficulty) => {
      resetSessionId();
      confirmNewPlayer(difficulty);
    },
    cancelNewPlayer,

    // Guess
    submitGuessViaEnter,
    onSubmit,
    giveUp,
  };
}
