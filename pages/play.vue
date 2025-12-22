<template>
  <main class="flex flex-1 flex-col gap-6 text-slate-100">
    <header class="flex flex-col gap-4">
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
