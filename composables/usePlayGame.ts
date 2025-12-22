import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player } from "~/types/player";
import { useCluePool } from "~/composables/useCluePool";
import { usePlayerSearch } from "~/composables/usePlayerSearch";
import { useTransferTimeline } from "~/composables/useTransferTimeline";

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
  const confirmResetOpen = ref(false);
  const pendingName = ref<string | undefined>(undefined);

  const schema = v.object({
    guess: v.pipe(v.string(), v.minLength(1, "Please guess a player")),
  });
  type Schema = v.InferOutput<typeof schema>;

  const formState = reactive<Schema>({
    guess: "",
  });

  const hasGuess = computed(() => formState.guess.trim().length > 0);

  watch(
    () => formState.guess,
    () => {
      if (isError.value) isError.value = false;
    },
  );

  const { searchTerm, suggestions, onSearch, clearSearch } = usePlayerSearch();
  const { careerTimeline } = useTransferTimeline(player);
  const {
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    selectRandomClues,
    revealNextClue,
  } = useCluePool(player, { isLoading });

  async function loadPlayer(name?: string) {
    isLoading.value = true;
    errorMessage.value = "";
    isError.value = false;

    try {
      const endpoint = name
        ? `/api/getPlayer?name=${encodeURIComponent(name)}`
        : "/api/randomPlayer";

      player.value = await $fetch<Player>(endpoint);
      currentName.value = player.value?.name;
      console.log("[footyguess] Loaded player:", player.value);
      formState.guess = "";
      clearSearch();
      errorMessage.value = "";
      selectRandomClues();
      return;

      toast.add({
        title: "No player available",
        description: "Please try again in a moment.",
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
      player.value = null;
    } catch (err) {
      console.error("Failed to load player", err);
      errorMessage.value =
        "Couldn't fetch the mystery player. Please try again.";
      player.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  function onSubmit(event: FormSubmitEvent<any>) {
    event.preventDefault();
    if (!player.value) return;

    const rawGuess = (event as any).data?.guess as unknown;
    const normalizedGuess = getGuessValue(rawGuess).toLowerCase();
    const correct = player.value.name.trim().toLowerCase();

    if (normalizedGuess === correct) {
      isError.value = false;
      incrementStreak();
      persistLastPlayer(player.value.name);
      toast.add({
        title: "Correct!",
        description: "You cracked the code.",
        color: "primary",
        icon: "i-lucide-party-popper",
      });
      router.push("/won");
    } else {
      isError.value = true;
      resetStreak();
      toast.add({
        title: "Wrong player",
        description: "Try again - follow the clues.",
        color: "error",
        icon: "i-lucide-x-circle",
      });

      triggerShake?.();
    }
  }

  function submitGuessViaEnter() {
    onSubmit({
      preventDefault: () => {},
      data: { guess: formState.guess },
    } as FormSubmitEvent<any>);
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
      localStorage.setItem("footyguess_last_player", name);
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

  function incrementStreak() {
    streak.value += 1;
    if (streak.value > bestStreak.value) {
      bestStreak.value = streak.value;
    }
    saveStreak();
  }

  function resetStreak() {
    streak.value = 0;
    saveStreak();
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
  confirmResetOpen,
  loadPlayer,
  requestNewPlayer,
  confirmNewPlayer,
  cancelNewPlayer,
  revealNextClue,
  onSearch,
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
