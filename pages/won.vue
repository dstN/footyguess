<template>
  <ErrorBoundary>
    <main class="flex flex-1 flex-col gap-6 text-slate-100">
      <VictoryCard
        :streak="streak"
        :best-streak="bestStreak"
        :last-player="lastPlayer"
        :last-player-tm-url="lastPlayerTmUrl"
        :title="victoryTitle"
        :subtitle="victorySubtitle"
        :icon="victoryIcon"
        :last-player-label="lastPlayerLabel"
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
          @submit="handleSubmit"
        />
      </div>

      <div class="flex items-center justify-center gap-3">
        <HighscoreModal
          :last-player-id="lastPlayerId"
          :last-player-name="lastPlayer"
          button-color="primary"
        />
        <UButton
          color="primary"
          variant="ghost"
          icon="i-lucide-coffee"
          class="cursor-pointer"
          to="https://ko-fi.com/dstn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="hidden md:inline">Buy me a coffee</span>
        </UButton>
        <HelpModal
          button-label="How to Play"
          button-variant="ghost"
          button-color="primary"
          button-size="md"
        />
      </div>
    </main>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ErrorBoundary from "~/components/ErrorBoundary.vue";
import HighscoreModal from "~/components/HighscoreModal.vue";
import HelpModal from "~/components/HelpModal.vue";
import VictoryCard from "~/components/VictoryCard.vue";
import ScoreSnapshot from "~/components/ScoreSnapshot.vue";
import LeaderboardSubmit from "~/components/LeaderboardSubmit.vue";
import { useWonState } from "~/composables/useWonState";

const {
  nickname,
  streak,
  bestStreak,
  totalScore,
  lastScore,
  lastPlayer,
  lastPlayerId,
  lastPlayerTmUrl,
  displaySubmittedTypes,
  submit,
} = useWonState();

const route = useRoute();
const isSurrender = computed(() => {
  return route.query.surrendered === "true" || lastScore.value?.score === 0;
});

const victoryTitle = computed(() => {
  if (isSurrender.value) return "You gave up!";
  return "You cracked the code!";
});

const victorySubtitle = computed(() => {
  if (isSurrender.value) {
    return "Your streak was reset. Start a new run or check your total score.";
  }
  // If malice penalty < 0, it means wrong guesses occurred, resetting the streak
  if ((lastScore.value?.malicePenalty ?? 0) < 0) {
    return "Nice save! But the wrong guess reset your streak.";
  }
  return "Keep the run going or drop your score on the board.";
});

const victoryIcon = computed(() => {
  if (isSurrender.value) return "i-lucide-flag-triangle-right";
  return "i-lucide-party-popper";
});

const lastPlayerLabel = computed(() => {
  if (isSurrender.value) return "The player was:";
  return "Last win:";
});

async function handleSubmit(type: "round" | "total" | "streak") {
  const success = await submit(type);

  if (success) {
    useToast().add({
      title: "Submitted",
      description:
        type === "round"
          ? "Added your round score to the leaderboard"
          : `Your ${type} will now auto-update after each win`,
      color: "primary",
    });
  } else {
    useToast().add({
      title: "Submit failed",
      description: "Please try again",
      color: "error",
    });
  }
}
</script>
