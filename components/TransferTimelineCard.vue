<template>
  <UCard
    class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
    data-testid="transfer-timeline"
  >
    <template #header>
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div class="hidden sm:block">
            <p class="text-primary-200/80 text-xs tracking-[0.26em] uppercase">
              Club timeline
            </p>
            <p
              class="text-lg font-semibold text-white"
              data-testid="player-name"
            >
              Career history
            </p>
          </div>
          <div class="sm:hidden">
            <p class="text-primary-200/80 text-xs tracking-[0.26em] uppercase">
              Timeline
            </p>
          </div>
        </div>
        <!-- Badge row: Difficulty | Live Score | Transfers | Help -->
        <!-- Badge row: Difficulty | Live Score | Transfers | Guesses -->
        <div
          class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end sm:gap-3"
        >
          <!-- Difficulty (left on mobile) -->
          <DifficultyBadge
            :difficulty="difficulty ?? null"
            :current-streak="currentStreak"
          />

          <!-- Transfers (right on mobile) -->
          <UBadge
            v-if="showBadge"
            color="primary"
            variant="soft"
            class="flex w-full items-center justify-center text-xs sm:w-auto"
          >
            Transfers: {{ items.length }}
          </UBadge>

          <!-- Guesses Indicator -->
          <UBadge
            v-if="difficulty"
            :color="(wrongGuesses ?? 0) > 0 ? 'error' : 'neutral'"
            variant="soft"
            class="flex w-full items-center justify-center text-xs transition-colors sm:w-auto"
          >
            Guesses: {{ wrongGuesses ?? 0 }} / {{ MAX_WRONG_GUESSES + 1 }}
          </UBadge>

          <!-- Live Score (middle on mobile, between difficulty and transfers) -->
          <LiveScore
            v-if="startedAt && difficulty"
            :difficulty="difficulty"
            :started-at="startedAt"
            :transfer-count="transferCount"
            :clues-used="cluesUsed"
            :wrong-guesses="wrongGuesses"
            :streak="currentStreak ?? 0"
          />
        </div>
      </div>
    </template>

    <TransferTimelineView
      :items="items"
      :is-loading="isLoading"
    />
  </UCard>
</template>

<script setup lang="ts">
import DifficultyBadge from "~/components/DifficultyBadge.vue";
import TransferTimelineView from "~/components/TransferTimelineView.vue";
import LiveScore from "~/components/LiveScore.vue";
import { MAX_WRONG_GUESSES } from "~/utils/scoring-constants";

interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
}

import type { DifficultyInfo } from "~/types/player";

defineProps<{
  items: TimelineItem[];
  isLoading: boolean;
  showBadge?: boolean;
  currentStreak?: number;
  difficulty?: DifficultyInfo | null;
  startedAt?: number;
  transferCount?: number;
  cluesUsed?: number;
  wrongGuesses?: number;
}>();
</script>
