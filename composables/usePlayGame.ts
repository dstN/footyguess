import { computed, inject, onMounted, reactive, ref, watch } from "vue";
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player } from "~/types/player";
import type { GuessFormState, GuessFormOutput } from "~/types/forms";
import { GuessFormSchema } from "~/types/forms";
import { useCluePool } from "~/composables/useCluePool";
import { usePlayerSearch } from "~/composables/usePlayerSearch";
import { useTransferTimeline } from "~/composables/useTransferTimeline";
import type { ScoreBreakdown } from "~/server/utils/scoring";
import { sanitizeText } from "~/utils/sanitize";

interface RoundState {
  id: string;
  token: string;
  sessionId: string;
  expiresAt: number;
  cluesUsed: number;
}

export function usePlayGame() {
  const router = useRouter();
  const toast = useToast();
  const triggerShake = inject<() => void>("triggerShake");

  const player = ref<Player | null>(null);
  const currentName = ref<string | undefined>(undefined);
  const isLoading = ref(false);
  const errorMessage = ref("");
  const isError = ref(false);
  const streak = ref(0);
  const bestStreak = ref(0);
  const sessionId = ref<string | null>(null);
  const round = ref<RoundState | null>(null);
  const confirmResetOpen = ref(false);
  const pendingName = ref<string | undefined>(undefined);

  const schema = GuessFormSchema;

  const formState = reactive<GuessFormState>({
    guess: "",
  });

  const hasGuess = computed(() => formState.guess.trim().length > 0);

  // Clear error when user starts typing (no unnecessary watcher)
  const onGuessInput = () => {
    if (isError.value) {
      isError.value = false;
      errorMessage.value = "";
    }
  };

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

  function ensureSessionId() {
    if (sessionId.value) return sessionId.value;
    if (import.meta.client) {
      const stored = localStorage.getItem("footyguess_session_id");
      if (stored) {
        sessionId.value = stored;
        return stored;
      }
    }
    const generated = crypto.randomUUID();
    sessionId.value = generated;
    if (import.meta.client) {
      localStorage.setItem("footyguess_session_id", generated);
    }
    return generated;
  }

  async function loadPlayer(name?: string) {
    isLoading.value = true;
    errorMessage.value = "";
    isError.value = false;

    try {
      const sid = ensureSessionId();
      const endpoint = name
        ? `/api/getPlayer?name=${encodeURIComponent(name)}&sessionId=${encodeURIComponent(sid)}`
        : `/api/randomPlayer?sessionId=${encodeURIComponent(sid)}`;

      const response = await $fetch<
        {
          round: RoundState;
        } & Player
      >(endpoint);

      player.value = response;
      currentName.value = response?.name;
      round.value = response.round;
      sessionId.value = response.round.sessionId;
      if (import.meta.client) {
        localStorage.setItem("footyguess_session_id", response.round.sessionId);
      }
      if (import.meta.dev) {
        console.log("[footyguess] Loaded player:", response);
      }
      formState.guess = "";
      clearSearch();
      errorMessage.value = "";
      selectRandomClues();
      return;
    } catch (err) {
      if (import.meta.dev) console.error("Failed to load player", err);
      errorMessage.value =
        "Couldn't fetch the mystery player. Please try again.";
      player.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function onSubmit(event: FormSubmitEvent<GuessFormOutput>) {
    event.preventDefault();
    if (!player.value || !round.value) return;
    const rawGuess = (event as any).data?.guess as unknown;
    const guessValue = getGuessValue(rawGuess);
    if (!guessValue) return;
    await submitGuess(guessValue);
  }

  function submitGuessViaEnter() {
    onSubmit({
      preventDefault: () => {},
      data: { guess: formState.guess },
    } as FormSubmitEvent<GuessFormOutput>);
  }

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

  function persistLastPlayer(name: string) {
    if (import.meta.client) {
      localStorage.setItem("footyguess_last_player", sanitizeText(name));
    }
  }

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

  function saveStreak() {
    if (!import.meta.client) return;
    localStorage.setItem("footyguess_streak", String(streak.value));
    localStorage.setItem("footyguess_best_streak", String(bestStreak.value));
  }

  function resetStreak() {
    streak.value = 0;
    saveStreak();
  }

  async function useClueServer() {
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
      throw err; // Propagate to caller
    }
  }

  async function revealNextClueWithServer() {
    await useClueServer();
    revealNextClue();
  }

  async function submitGuess(guess: string) {
    if (!round.value) return;
    errorMessage.value = "";
    try {
      const res = await $fetch<{
        correct: boolean;
        score: number;
        breakdown: ScoreBreakdown;
        streak: number;
        bestStreak: number;
        playerName: string;
        difficulty: Player["difficulty"];
      }>("/api/guess", {
        method: "POST",
        body: {
          roundId: round.value.id,
          token: round.value.token,
          guess,
        },
      });

      streak.value = res.streak;
      bestStreak.value = res.bestStreak;
      saveStreak();

      if (res.correct) {
        isError.value = false;
        persistLastPlayer(res.playerName);
        toast.add({
          title: `Correct! +${res.breakdown.preStreak} base pts`,
          description: `Time: +${Math.round((res.breakdown.timeMultiplier - 1) * 100)}% · Streak: ${Math.round(res.breakdown.streakBonus * 100)}% → total ${res.score} pts · Streak ${res.streak}`,
          color: "primary",
          icon: "i-lucide-party-popper",
        });
        router.push("/won");
      } else {
        isError.value = true;
        errorMessage.value =
          "Incorrect guess - follow the clues more carefully";
        toast.add({
          title: "Wrong player",
          description: "Try again - follow the clues.",
          color: "error",
          icon: "i-lucide-x-circle",
        });
        triggerShake?.();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit guess";
      errorMessage.value = message;
      isError.value = true;
      if (import.meta.dev) console.error("Failed to submit guess", err);
      toast.add({
        title: "Guess failed",
        description: message,
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
    }
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

function getGuessValue(raw: unknown) {
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object") {
    const maybeValue = (raw as any).value ?? (raw as any).label;
    if (typeof maybeValue === "string") return maybeValue.trim();
  }
  return "";
}
