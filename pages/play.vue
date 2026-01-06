<template>
  <ErrorBoundary>
    <main
      class="flex flex-1 flex-col gap-6 text-slate-100"
      role="main"
      aria-label="Game play area"
      data-testid="game-container"
    >
      <PlayHeader
        :streak="streak"
        :best-streak="bestStreak"
        :is-loading="isLoading"
        :tip-button-disabled="tipButtonDisabled"
        :confirm-reset-open="confirmResetOpen"
        @confirm-new-player="confirmNewPlayer"
        @cancel-new-player="cancelNewPlayer"
        @request-new-player="requestNewPlayer"
        @reveal-clue="revealNextClue"
        @update:confirmResetOpen="(val) => (confirmResetOpen = val)"
      />

      <UAlert
        v-show="Boolean(errorMessage)"
        color="error"
        icon="i-lucide-alert-triangle"
        :title="errorMessage"
        class="border border-red-500/30 bg-white/5 text-red-500/90"
      />

      <section class="space-y-4">
        <ClueBar
          :revealed-clues="revealedClues"
          :hidden-clue-labels="hiddenClueLabels"
          :tip-button-disabled="tipButtonDisabled"
          @reveal-clue="revealNextClue"
        />

        <TransferTimelineCard
          v-memo="[careerTimeline, difficulty, currentName, streak]"
          :items="careerTimeline"
          :is-loading="isLoading"
          :show-badge="Boolean(currentName)"
          :difficulty="difficulty"
          :current-streak="streak"
        />

        <DevPanel
          :visible="isDev"
          :url="devUrl"
          :submitting="devSubmitting"
          :status="devStatus"
          :player-id="devPlayerId"
          :error="devError"
          @update:url="(val) => (devUrl = val)"
          @submit="submitDevUrl"
        />
      </section>

      <GuessFooter
        :schema="schema"
        :state="formState"
        :model-value="formState.guess"
        :search-term="searchTerm"
        :suggestions="suggestions"
        :is-loading="isLoading"
        :is-error="isError"
        :has-guess="hasGuess"
        @update:model-value="(val: string) => (formState.guess = val)"
        @update:search-term="onSearch"
        @submit="onSubmit"
        @enter="submitGuessViaEnter"
        @clear="clearGuess"
      />
    </main>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import ErrorBoundary from "~/components/ErrorBoundary.vue";
import ClueBar from "~/components/ClueBar.vue";
import GuessFooter from "~/components/GuessFooter.vue";
import TransferTimelineCard from "~/components/TransferTimelineCard.vue";
import PlayHeader from "~/components/PlayHeader.vue";
import DevPanel from "~/components/DevPanel.vue";
import { usePlayGame } from "~/composables/usePlayGame";
import { ref, onBeforeUnmount } from "vue";

useHead({
  title: "Footyguess - Mystery Player",
});

const {
  schema,
  formState,
  hasGuess,
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
  confirmResetOpen,
  confirmNewPlayer,
  cancelNewPlayer,
  loadPlayer,
  requestNewPlayer,
  revealNextClue,
  onSearch,
  submitGuessViaEnter,
  onSubmit,
  clearGuess,
} = usePlayGame();

const isDev = import.meta.dev;
const devUrl = ref("");
const devStatus = ref<string | null>(null);
const devError = ref<string | null>(null);
const devSubmitting = ref(false);
const devRequestId = ref<number | null>(null);
const devPlayerId = ref<number | null>(null);
let devPollTimer: ReturnType<typeof setInterval> | null = null;

async function pollDevStatus() {
  if (!devRequestId.value) return;
  try {
    const res = await $fetch<{
      status: string;
      playerId: number | null;
      error: string | null;
    }>(`/api/requestStatus?id=${devRequestId.value}`);
    devStatus.value = res.status;
    devPlayerId.value = res.playerId ?? null;
    if (res.error) devError.value = res.error;
    if (["done", "failed"].includes(res.status) && devPollTimer) {
      clearInterval(devPollTimer);
      devPollTimer = null;
    }
  } catch (err) {
    devError.value = "Failed to fetch request status.";
  }
}

async function submitDevUrl() {
  devError.value = null;
  devStatus.value = null;
  devPlayerId.value = null;
  if (!devUrl.value.trim()) return;
  devSubmitting.value = true;
  try {
    const res = await $fetch<{
      id: number;
      status: string;
      playerId: number | null;
    }>("/api/requestPlayer", {
      method: "POST",
      body: { url: devUrl.value.trim() },
    });
    devRequestId.value = res.id;
    devStatus.value = res.status;
    devPlayerId.value = res.playerId ?? null;
    if (!devPollTimer) {
      devPollTimer = setInterval(pollDevStatus, 5000);
    }
  } catch (err) {
    devError.value = "Failed to submit URL.";
  } finally {
    devSubmitting.value = false;
  }
}

onBeforeUnmount(() => {
  if (devPollTimer) clearInterval(devPollTimer);
});
</script>
