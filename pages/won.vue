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
          aria-label="Buy me a coffee"
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

useHead({
  link: [{ rel: "canonical", href: "https://footyguess.yinside.de/won" }],
});

const route = useRoute();

/**
 * Outcome reason from query param
 * - 'win': correct guess
 * - 'surrender': gave up
 * - 'aborted': too many wrong guesses (6th wrong guess)
 */
type OutcomeReason = "win" | "surrender" | "aborted";

const outcomeReason = computed<OutcomeReason>(() => {
  const reason = route.query.reason as string | undefined;
  if (reason === "surrender" || route.query.surrendered === "true") {
    return "surrender";
  }
  if (reason === "aborted") {
    return "aborted";
  }
  // Legacy fallback: check if score is 0 (indicates loss)
  if (lastScore.value?.score === 0) {
    return "aborted";
  }
  return "win";
});

const isLoss = computed(
  () =>
    outcomeReason.value === "surrender" || outcomeReason.value === "aborted",
);

const pageTitle = computed(() => {
  switch (outcomeReason.value) {
    case "surrender":
      return "Gave Up - FootyGuess";
    case "aborted":
      return "Round Lost - FootyGuess";
    default:
      return "Victory - FootyGuess";
  }
});

const victoryTitle = computed(() => {
  switch (outcomeReason.value) {
    case "surrender":
      return "You gave up!";
    case "aborted":
      return "Round lost!";
    default:
      return "You cracked the code!";
  }
});

const victorySubtitle = computed(() => {
  switch (outcomeReason.value) {
    case "surrender":
      return "Your streak was reset. Start a new run or check your total score.";
    case "aborted":
      return "Too many wrong guesses. Your streak was reset.";
    default:
      // If malice penalty < 0, it means wrong guesses occurred, resetting the streak
      if ((lastScore.value?.malicePenalty ?? 0) < 0) {
        return "Nice save! But the wrong guess reset your streak.";
      }
      return "Keep the run going or drop your score on the board.";
  }
});

const victoryIcon = computed(() => {
  switch (outcomeReason.value) {
    case "surrender":
      return "i-lucide-flag-triangle-right";
    case "aborted":
      return "i-lucide-skull";
    default:
      return "i-lucide-party-popper";
  }
});

const lastPlayerLabel = computed(() => {
  if (isLoss.value) return "The player was:";
  return "Last win:";
});

// Update SEO meta dynamically based on outcome
useSeoMeta({
  title: pageTitle,
  ogTitle: computed(() => {
    switch (outcomeReason.value) {
      case "surrender":
        return "I gave up on FootyGuess!";
      case "aborted":
        return "I lost a round on FootyGuess!";
      default:
        return "I cracked the code on FootyGuess!";
    }
  }),
  description: computed(() => {
    if (isLoss.value) {
      return "Try again! Can you guess the mystery player from their transfer history?";
    }
    return "Check your score, submit to the leaderboard, and keep your streak going!";
  }),
  ogDescription: computed(() => {
    if (isLoss.value) {
      return "Try again! Can you guess the mystery player?";
    }
    return "See how you scored and compete on the FootyGuess leaderboard.";
  }),
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
