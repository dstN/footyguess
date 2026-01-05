<template>
  <UCard
    class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
    data-testid="transfer-timeline"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div>
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
          <DifficultyBadge
            :difficulty="difficulty"
            :current-streak="currentStreak"
          />
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            v-if="showBadge"
            color="primary"
            variant="soft"
            class="bg-primary-500/10 text-primary-100 text-xs"
          >
            Transfers: {{ items.length }}
          </UBadge>
          <HelpModal
            :show-label="false"
            button-size="xs"
            button-variant="ghost"
            button-color="neutral"
            button-class="opacity-60 hover:opacity-100"
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
import HelpModal from "~/components/HelpModal.vue";

interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
}

defineProps<{
  items: TimelineItem[];
  isLoading: boolean;
  showBadge?: boolean;
  currentStreak?: number;
  difficulty?: {
    tier: "easy" | "medium" | "hard" | "ultra";
    multiplier: number;
    basePoints: number;
  } | null;
}>();
</script>
