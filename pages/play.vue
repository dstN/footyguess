<template>
  <main class="flex flex-1 flex-col gap-6 text-slate-100">
    <header class="flex flex-col gap-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <UBadge
            color="primary"
            variant="soft"
            class="tracking-[0.18em] uppercase"
          >
            Mystery player
          </UBadge>
        </div>
        <StreakBar :streak="streak" :best-streak="bestStreak" />
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <UButton
            icon="i-lucide-shuffle"
            color="neutral"
            variant="ghost"
            :disabled="isLoading"
            @click="requestNewPlayer()"
          >
            New mystery
          </UButton>
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
      class="border border-red-500/30 bg-red-500/10"
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

    <Teleport v-if="confirmResetOpen" to="body">
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <UCard class="relative z-[210] w-full max-w-md">
          <template #header>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-primary-200">
                Confirm
              </p>
              <p class="text-lg font-semibold text-white">Reset streak?</p>
            </div>
          </template>
          <p class="text-sm text-slate-300">
            Starting a new mystery now will reset your current streak. Continue?
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="cancelNewPlayer">
                Cancel
              </UButton>
              <UButton color="primary" @click="confirmNewPlayer">
                Yes, reset &amp; load
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </Teleport>
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
} = usePlayGame();
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
