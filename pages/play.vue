<template>
  <main class="flex flex-1 flex-col gap-6 text-slate-100" role="main" aria-label="Game play area">
    <header class="flex flex-col gap-4" role="banner">
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-2">
          <UBadge
            color="primary"
            variant="soft"
            class="tracking-[0.18em] uppercase"
          >
            Mystery player
          </UBadge>
        </div>
        <StreakBar
          :streak="streak"
          :best-streak="bestStreak"
          aria-label="Streak information"
        />
      </div>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="space-y-1">
          <h1
            class="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white"
          >
            Footyguess: Transfer Trail
          </h1>
          <p class="text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Decode the career path, grab a random tip, and lock in your guess.
          </p>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <UModal
            v-model="confirmResetOpen"
            :overlay="true"
            :dissmissible="false"
            :modal="true"
            :scrollable="false"
            title="Confirm"
            description="Starting a new mystery now will reset your current streak. Continue?"
          >
            <template #default>
              <UButton
                icon="i-lucide-shuffle"
                color="neutral"
                variant="ghost"
                :disabled="isLoading"
                @click="requestNewPlayer()"
              >
                New mystery
              </UButton>
            </template>

            <template #footer="{ close }">
              <div class="flex justify-end gap-2">
                <UButton
                  variant="ghost"
                  color="neutral"
                  @click="
                    () => {
                      cancelNewPlayer();
                      close();
                    }
                  "
                >
                  Cancel
                </UButton>
                <UButton
                  color="primary"
                  @click="
                    () => {
                      confirmNewPlayer();
                      close();
                    }
                  "
                >
                  Yes, reset &amp; load
                </UButton>
              </div>
            </template>
          </UModal>
          <UButton
            icon="i-lucide-sparkles"
            color="primary"
            variant="solid"
            :disabled="tipButtonDisabled"
            @click="revealNextClue"
          >
            Get a tip
          </UButton>
        </div>
      </div>
    </header>

    <UAlert
      v-if="errorMessage"
      color="error"
      icon="i-lucide-alert-triangle"
      :title="errorMessage"
      class="border border-red-500/30 bg-white/5 text-red-500/90"
    />

    <section class="space-y-4">
      <ClueBar
        :revealed-clues="revealedClues"
        :hidden-clue-labels="hiddenClueLabels"
      />

      <TransferTimelineCard
        :items="careerTimeline"
        :is-loading="isLoading"
        :show-badge="Boolean(currentName)"
        :difficulty="difficulty"
        :current-streak="streak"
      />

      <UCard
        v-if="isDev"
        class="border-primary-900/40 border bg-slate-950/60"
      >
        <template #header>
          <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
            Dev only
          </p>
        </template>
        <div class="space-y-3">
          <p class="text-sm text-slate-300">
            Request a player by Transfermarkt URL.
          </p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <UInput
              v-model="devUrl"
              placeholder="https://www.transfermarkt.com/..."
              size="lg"
              class="flex-1"
            />
            <UButton
              color="primary"
              :loading="devSubmitting"
              @click="submitDevUrl"
            >
              Submit URL
            </UButton>
          </div>
          <p v-if="devStatus" class="text-sm text-slate-200">
            Status: {{ devStatus }}
            <span v-if="devPlayerId"> (Player ID: {{ devPlayerId }})</span>
          </p>
          <p v-if="devError" class="text-sm text-red-400">
            {{ devError }}
          </p>
        </div>
      </UCard>
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
</template>

<script setup lang="ts">
import ClueBar from "~/components/ClueBar.vue";
import GuessFooter from "~/components/GuessFooter.vue";
import TransferTimelineCard from "~/components/TransferTimelineCard.vue";
import StreakBar from "~/components/StreakBar.vue";
import { usePlayGame } from "~/composables/usePlayGame";

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
    const res = await $fetch<{ id: number; status: string; playerId: number | null }>(
      "/api/requestPlayer",
      {
        method: "POST",
        body: { url: devUrl.value.trim() },
      },
    );
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
