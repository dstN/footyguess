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
        <div
          class="flex w-full flex-row items-center justify-between gap-2 md:w-auto md:justify-end md:gap-3"
        >
          <!-- Difficulty (left on mobile) -->
          <DifficultyBadge
            :difficulty="difficulty ?? null"
            :current-streak="currentStreak"
          />

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

          <!-- Transfers + Help (right on mobile) -->
          <div class="flex items-center gap-1">
            <UBadge
              v-if="showBadge"
              color="primary"
              variant="soft"
              class="text-xs"
            >
              Transfers: {{ items.length }}
            </UBadge>
            <HelpModal
              :show-label="false"
              button-size="xs"
              button-variant="ghost"
              button-color="neutral"
              button-class="!p-0 h-4 w-4 text-slate-500 hover:text-slate-300 opacity-100"
              icon-size="h-4 w-4"
            />
          </div>
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
import HelpModal from "~/components/HelpModal.vue";
import LiveScore from "~/components/LiveScore.vue";

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
