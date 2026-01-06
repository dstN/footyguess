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
        <div
          class="flex w-full flex-row items-center justify-between gap-3 md:w-auto"
        >
          <div class="flex items-center gap-1">
            <DifficultyBadge
              :difficulty="difficulty"
              :current-streak="currentStreak"
            />
          </div>
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
              button-class="!p-0 h-3.5 w-3.5 text-slate-500 hover:text-slate-300 opacity-100"
              icon-size="h-3.5 w-3.5"
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
}>();
</script>
