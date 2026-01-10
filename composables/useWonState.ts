/**
 * useWonState Composable
 *
 * Manages the state and logic for the victory (won) page.
 * Handles session stats fetching, score submission, and auto-updates.
 */

import { ref, computed, onMounted } from "vue";
import type { RoundScoreInfo } from "~/types/player";
import { logInfo, logError } from "~/utils/client-logger";

export function useWonState() {
  // Session state
  const sessionId = ref<string | null>(null);
  const nickname = ref("");

  // Score state
  const streak = ref(0);
  const bestStreak = ref(0);
  const totalScore = ref(0);
  const lastScore = ref<RoundScoreInfo | null>(null);

  // Player state
  const lastPlayer = ref<string | null>(null);
  const lastPlayerId = ref<number | null>(null);

  // Submission state
  const submittedTypes = ref<string[]>([]);
  const roundSubmittedThisSession = ref(false);
  const isLoading = ref(false);

  // Computed: can user submit?
  const canSubmit = computed(() => nickname.value.trim().length > 0);

  // Computed: display submitted types with session context
  const displaySubmittedTypes = computed(() => {
    const autoTypes = submittedTypes.value.filter(
      (t) => t === "total" || t === "streak",
    );
    if (roundSubmittedThisSession.value) {
      return [...autoTypes, "round"];
    }
    return autoTypes;
  });

  /**
   * Fetch session stats from the API
   */
  async function fetchStats() {
    if (!sessionId.value) return;

    isLoading.value = true;
    try {
      const res = await $fetch<{
        streak: number;
        bestStreak: number;
        totalScore: number;
        lastPlayerId: number | null;
        lastScore: RoundScoreInfo | null;
        nickname: string | null;
        submittedTypes: string[];
      }>(`/api/sessionStats?sessionId=${encodeURIComponent(sessionId.value)}`);

      streak.value = res.streak ?? streak.value;
      bestStreak.value = res.bestStreak ?? bestStreak.value;
      totalScore.value = res.totalScore ?? 0;
      lastScore.value = res.lastScore;
      lastPlayerId.value = res.lastPlayerId;
      lastPlayer.value = res.lastScore?.playerName ?? null;
      submittedTypes.value = res.submittedTypes ?? [];

      if (res.nickname) {
        nickname.value = res.nickname;
      }

      // Auto-update total and streak if previously submitted
      await autoUpdateScores();
    } catch (err) {
      logError("useWonState", "Failed to load session stats", err as Error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Auto-update scores for previously submitted types
   */
  async function autoUpdateScores() {
    if (!sessionId.value || !nickname.value) return;

    const typesToUpdate = submittedTypes.value.filter(
      (t) => t === "total" || t === "streak",
    );

    for (const type of typesToUpdate) {
      try {
        await $fetch("/api/submitScore", {
          method: "POST",
          body: {
            sessionId: sessionId.value,
            nickname: nickname.value,
            type,
          },
        });
        logInfo("useWonState", `Auto-updated ${type} score`);
      } catch (err) {
        logError("useWonState", `Auto-update ${type} failed`, err as Error);
      }
    }
  }

  /**
   * Submit a score to the leaderboard
   */
  async function submit(type: "round" | "total" | "streak"): Promise<boolean> {
    if (!sessionId.value) return false;

    try {
      await $fetch("/api/submitScore", {
        method: "POST",
        body: {
          sessionId: sessionId.value,
          nickname: nickname.value,
          type,
        },
      });

      // Track round submission separately (resets each page load)
      if (type === "round") {
        roundSubmittedThisSession.value = true;
      } else {
        // Add to submitted types for total/streak (enables auto-update)
        if (!submittedTypes.value.includes(type)) {
          submittedTypes.value = [...submittedTypes.value, type];
        }
      }

      logInfo("useWonState", `Submitted ${type} score`);
      return true;
    } catch (err) {
      logError("useWonState", "Submit score failed", err as Error);
      return false;
    }
  }

  /**
   * Initialize state from localStorage
   */
  function initFromStorage() {
    if (!import.meta.client) return;

    sessionId.value = localStorage.getItem("footyguess_session_id");

    const storedStreak = Number.parseInt(
      localStorage.getItem("footyguess_streak") || "0",
      10,
    );
    const storedBest = Number.parseInt(
      localStorage.getItem("footyguess_best_streak") || "0",
      10,
    );

    streak.value = Number.isFinite(storedStreak) ? storedStreak : 0;
    bestStreak.value = Number.isFinite(storedBest) ? storedBest : 0;
    lastPlayer.value = localStorage.getItem("footyguess_last_player");
  }

  // Initialize on mount
  onMounted(() => {
    initFromStorage();
    fetchStats();
  });

  return {
    // State
    sessionId,
    nickname,
    streak,
    bestStreak,
    totalScore,
    lastScore,
    lastPlayer,
    lastPlayerId,
    submittedTypes,
    isLoading,

    // Computed
    canSubmit,
    displaySubmittedTypes,

    // Actions
    fetchStats,
    submit,
  };
}
