<template>
  <header
    class="flex flex-col gap-4"
    role="banner"
  >
    <div class="flex items-center justify-between gap-2">
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
        <!-- Step 1: Confirm streak reset modal -->
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
                    close();
                    showDifficultySelector();
                  }
                "
              >
                Yes, reset &amp; choose difficulty
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Step 2: Difficulty selector modal (shown after confirm) -->
        <DifficultySelector
          ref="difficultySelectorRef"
          v-model="selectedDifficulty"
          @confirm="handleDifficultyConfirm"
        >
          <!-- Hidden trigger - we open programmatically -->
          <template #default>
            <span class="hidden" />
          </template>
        </DifficultySelector>
      </div>
    </div>

    <div
      class="hidden flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:flex"
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
          icon="i-lucide-flag-triangle-right"
          color="white"
          variant="ghost"
          class="cursor-pointer"
          :disabled="tipButtonDisabled"
          @click="$emit('give-up')"
        >
          Give up
        </UButton>
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
import { ref, watch, inject, nextTick } from "vue";
import StreakBar from "./StreakBar.vue";
import DifficultySelector from "./DifficultySelector.vue";
import type { UserSelectedDifficulty } from "~/types/player";

const setModalOpen = inject<(open: boolean) => void>("setModalOpen");

const props = defineProps<{
  streak: number;
  bestStreak: number;
  isLoading: boolean;
  tipButtonDisabled: boolean;
  confirmResetOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm-new-player", difficulty: UserSelectedDifficulty): void;
  (e: "cancel-new-player"): void;
  (e: "request-new-player"): void;
  (e: "reveal-clue"): void;
  (e: "give-up"): void;
  (e: "update:confirmResetOpen", value: boolean): void;
}>();

const selectedDifficulty = ref<UserSelectedDifficulty>("default");
const difficultySelectorRef = ref<InstanceType<
  typeof DifficultySelector
> | null>(null);

/**
 * Show the difficulty selector after user confirms streak reset
 */
function showDifficultySelector() {
  // Give the confirm modal time to close
  nextTick(() => {
    difficultySelectorRef.value?.open();
  });
}

/**
 * Handle difficulty selection - emit with selected difficulty
 */
function handleDifficultyConfirm(difficulty: UserSelectedDifficulty) {
  emit("confirm-new-player", difficulty);
}

// Notify layout when confirm modal opens/closes
watch(
  () => props.confirmResetOpen,
  (open) => {
    setModalOpen?.(open);
  },
);
</script>
