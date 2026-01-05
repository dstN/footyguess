<template>
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
</template>

<script setup lang="ts">
import StreakBar from "./StreakBar.vue";

defineProps<{
  streak: number;
  bestStreak: number;
  isLoading: boolean;
  tipButtonDisabled: boolean;
  confirmResetOpen: boolean;
}>();

defineEmits<{
  (e: "confirm-new-player"): void;
  (e: "cancel-new-player"): void;
  (e: "request-new-player"): void;
  (e: "reveal-clue"): void;
  (e: "update:confirmResetOpen", value: boolean): void;
}>();
</script>
