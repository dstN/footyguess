<template>
  <header
    class="flex flex-col gap-4"
    role="banner"
  >
    <div
      class="flex items-center justify-between gap-2"
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
      <div class="flex items-center gap-2">
        <StreakBar
          class="hidden sm:block"
          :streak="streak"
          :best-streak="bestStreak"
          aria-label="Streak information"
        />
        <UModal
          :model-value="confirmResetOpen"
          @update:model-value="$emit('update:confirmResetOpen', $event)"
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
              size="sm"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="$emit('request-new-player')"
            >
              New game
            </UButton>
          </template>

          <template #footer="{ close }">
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                class="cursor-pointer"
                @click="
                  () => {
                    $emit('cancel-new-player');
                    close();
                  }
                "
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                class="cursor-pointer"
                @click="
                  () => {
                    $emit('confirm-new-player');
                    close();
                  }
                "
              >
                Yes, reset &amp; load
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </div>

    <div
      class="hidden md:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
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
        <UButton
          icon="i-lucide-sparkles"
          color="primary"
          variant="solid"
          class="cursor-pointer"
          :disabled="tipButtonDisabled"
          @click="$emit('reveal-clue')"
        >
          Get a tip
        </UButton>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { watch, inject } from "vue";
import StreakBar from "./StreakBar.vue";

const setModalOpen = inject<(open: boolean) => void>("setModalOpen");

const props = defineProps<{
  streak: number;
  bestStreak: number;
  isLoading: boolean;
  tipButtonDisabled: boolean;
  confirmResetOpen: boolean;
}>();

// Notify layout when confirm modal opens/closes
watch(
  () => props.confirmResetOpen,
  (open) => {
    setModalOpen?.(open);
  },
);

defineEmits<{
  (e: "confirm-new-player"): void;
  (e: "cancel-new-player"): void;
  (e: "request-new-player"): void;
  (e: "reveal-clue"): void;
  (e: "update:confirmResetOpen", value: boolean): void;
}>();
</script>
