<template>
  <ErrorBoundary>
    <main class="flex flex-1 flex-col gap-6 text-slate-100">
      <VictoryCard
        :streak="streak"
        :best-streak="bestStreak"
        :last-player="lastPlayer"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <ScoreSnapshot
          :last-score="lastScore"
          :total-score="totalScore"
          :best-streak="bestStreak"
        />

        <LeaderboardSubmit
          :nickname="nickname"
          :last-score="lastScore"
          :total-score="totalScore"
          :best-streak="bestStreak"
          :submitted-types="displaySubmittedTypes"
          @update:nickname="(val) => (nickname = val)"
          @submit="submit"
        />
      </div>

      <div class="flex items-center justify-center gap-3">
        <HighscoreModal
          :last-player-id="lastPlayerId"
          :last-player-name="lastPlayer"
        />
        <HelpModal
          button-label="How to Play"
          button-variant="ghost"
          button-color="neutral"
        />
      </div>
    </main>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import ErrorBoundary from "~/components/ErrorBoundary.vue";
import HighscoreModal from "~/components/HighscoreModal.vue";
import HelpModal from "~/components/HelpModal.vue";
import { ref, onMounted, computed } from "vue";
import VictoryCard from "~/components/VictoryCard.vue";
import ScoreSnapshot from "~/components/ScoreSnapshot.vue";
import LeaderboardSubmit from "~/components/LeaderboardSubmit.vue";
import type { RoundScoreInfo } from "~/types/player";

const streak = ref(0);
const bestStreak = ref(0);
const lastPlayer = ref<string | null>(null);
const lastPlayerId = ref<number | null>(null);
const totalScore = ref(0);
const lastScore = ref<RoundScoreInfo | null>(null);
const nickname = ref("");
const sessionId = ref<string | null>(null);
const submittedTypes = ref<string[]>([]);
const roundSubmittedThisSession = ref(false); // Track if THIS round was submitted

const canSubmit = computed(() => nickname.value.trim().length > 0);

// Computed to show which types have auto-update enabled (total/streak only)
const displaySubmittedTypes = computed(() => {
  const autoTypes = submittedTypes.value.filter(
    (t) => t === "total" || t === "streak",
  );
  if (roundSubmittedThisSession.value) {
    return [...autoTypes, "round"];
  }
  return autoTypes;
});

const lastBaseWithTime = computed(() =>
  lastScore.value
    ? Math.round(
        (lastScore.value.baseScore ?? 0) *
          (lastScore.value.timeMultiplier ?? 1),
      )
    : 0,
);

async function fetchStats() {
  if (!sessionId.value) return;
  try {
    const res = await $fetch<{
      streak: number;
      bestStreak: number;
      totalScore: number;
      lastPlayerId: number | null;
      lastScore: {
        score: number;
        baseScore: number;
        streak: number;
        streakBonus: number;
        timeMultiplier: number;
        playerName: string | null;
      } | null;
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
    if (res.nickname) nickname.value = res.nickname;

    // Auto-update total and streak if previously submitted
    await autoUpdateScores();
  } catch (err) {
    console.error("Failed to load session stats", err);
  }
}

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
    } catch (err) {
      console.error(`Auto-update ${type} failed`, err);
    }
  }
}

async function submit(type: "round" | "total" | "streak") {
  if (!sessionId.value) return;
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

    useToast().add({
      title: "Submitted",
      description:
        type === "round"
          ? "Added your round score to the leaderboard"
          : `Your ${type} will now auto-update after each win`,
      color: "primary",
    });
  } catch (err) {
    console.error("Submit score failed", err);
    useToast().add({
      title: "Submit failed",
      description: "Please try again",
      color: "error",
    });
  }
}

onMounted(() => {
  if (import.meta.client) {
    sessionId.value = localStorage.getItem("footyguess_session_id");
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
    lastPlayer.value = localStorage.getItem("footyguess_last_player");
    fetchStats();
  }
});
</script>
