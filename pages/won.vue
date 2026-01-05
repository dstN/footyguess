<template>
  <main class="flex flex-1 items-center justify-center">
    <div class="w-full max-w-3xl space-y-6">
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
          @update:nickname="(val) => (nickname = val)"
          @submit="submit"
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import VictoryCard from "~/components/VictoryCard.vue";
import ScoreSnapshot from "~/components/ScoreSnapshot.vue";
import LeaderboardSubmit from "~/components/LeaderboardSubmit.vue";

const streak = ref(0);
const bestStreak = ref(0);
const lastPlayer = ref<string | null>(null);
const totalScore = ref(0);
const lastScore = ref<{
  score: number;
  baseScore: number;
  streak: number;
  streakBonus: number;
  timeMultiplier: number;
  playerName: string | null;
} | null>(null);
const nickname = ref("");
const sessionId = ref<string | null>(null);

const canSubmit = computed(() => nickname.value.trim().length > 0);

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
      lastScore: {
        score: number;
        baseScore: number;
        streak: number;
        streakBonus: number;
        timeMultiplier: number;
        playerName: string | null;
      } | null;
      nickname: string | null;
    }>(`/api/sessionStats?sessionId=${encodeURIComponent(sessionId.value)}`);
    streak.value = res.streak ?? streak.value;
    bestStreak.value = res.bestStreak ?? bestStreak.value;
    totalScore.value = res.totalScore ?? 0;
    lastScore.value = res.lastScore;
    if (res.nickname) nickname.value = res.nickname;
  } catch (err) {
    console.error("Failed to load session stats", err);
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
    useToast().add({
      title: "Submitted",
      description: `Added your ${type} to the leaderboard`,
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
