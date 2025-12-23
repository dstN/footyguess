<template>
  <UCard
    class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div>
            <p class="text-primary-200/80 text-xs tracking-[0.26em] uppercase">
              Club timeline
            </p>
            <p class="text-lg font-semibold text-white">Career history</p>
          </div>
          <UTooltip
            v-if="difficulty"
            :text="`Difficulty: ${difficultyLabel} — Base max ${maxPoints} pts; with current streak bonus (${streakBonusPct}%): up to ${potentialWithStreak} pts.`"
            :popper="{ placement: 'bottom' }"
          >
            <UBadge
              :color="difficultyBadge.color"
              variant="soft"
              class="text-xs"
              :class="difficultyBadge.class"
            >
              {{ difficultyLabel }}
            </UBadge>
          </UTooltip>
        </div>
        <UBadge
          v-if="showBadge"
          color="primary"
          variant="soft"
          class="bg-primary-500/10 text-primary-100 text-xs"
        >
          Transfers: {{ items.length }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <div
        v-if="isLoading"
        class="space-y-4"
      >
        <USkeleton
          v-for="n in 4"
          :key="n"
          class="h-16 rounded-xl bg-white/5"
        />
      </div>

      <div
        v-else-if="items.length"
        class="border-primary-700/40 relative space-y-5 border-l pl-4"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="border-primary-900/40 relative rounded-xl border bg-white/5 px-4 py-3 shadow-sm backdrop-blur-sm"
        >
          <span
            class="bg-primary-400 absolute top-4 -left-2 block h-3 w-3 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]"
          />
          <p class="text-primary-200 text-xs tracking-[0.14em] uppercase">
            {{ item.date }}
          </p>
          <div class="flex items-center gap-3 text-sm text-slate-200">
            <span class="font-semibold text-white">{{ item.from }}</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="text-primary-200"
            />
            <span class="font-semibold text-white">{{ item.to }}</span>
          </div>
          <p class="min-h-[1.25rem] text-sm text-slate-300">
            {{ item.description }}
          </p>
        </div>
      </div>

      <UEmpty
        v-else
        icon="i-lucide-compass"
        title="No timeline data"
        description="We couldn't find transfers for this player."
        class="bg-white/5"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface TimelineItem {
  id: string;
  date: string;
  from: string;
  to: string;
  description?: string | null;
}

const props = defineProps<{
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

const difficultyLabel = computed(() => {
  if (props.difficulty?.tier === "easy") return "Easy";
  if (props.difficulty?.tier === "medium") return "Medium";
  if (props.difficulty?.tier === "hard") return "Hard";
  if (props.difficulty?.tier === "ultra") return "Ultra";
  return "";
});

const maxPoints = computed(() =>
  props.difficulty
    ? Math.round(props.difficulty.basePoints * props.difficulty.multiplier)
    : 0,
);

function getStreakBonusMultiplier(streak: number) {
  if (streak >= 100) return 0.3;
  if (streak >= 60) return 0.2;
  if (streak >= 30) return 0.15;
  if (streak >= 15) return 0.1;
  if (streak >= 5) return 0.05;
  return 0;
}

const streakBonusPct = computed(() =>
  Number((getStreakBonusMultiplier(props.currentStreak ?? 0) * 100).toFixed(0)),
);

const potentialWithStreak = computed(() =>
  props.difficulty
    ? Math.round(
        props.difficulty.basePoints *
          props.difficulty.multiplier *
          (1 + getStreakBonusMultiplier(props.currentStreak ?? 0)),
      )
    : 0,
);

const difficultyBadge = computed<{
  color: "success" | "warning" | "error" | "neutral";
  class: string;
}>(() => {
  if (!props.difficulty) return { color: "neutral", class: "" };
  if (props.difficulty.tier === "easy") {
    return { color: "success", class: "bg-green-500/10 text-green-100" };
  }
  if (props.difficulty.tier === "medium") {
    return { color: "warning", class: "bg-yellow-500/10 text-yellow-100" };
  }
  if (props.difficulty.tier === "hard") {
    return { color: "warning", class: "bg-orange-500/10 text-orange-100" };
  }
  if (props.difficulty.tier === "ultra") {
    return { color: "error", class: "bg-red-500/10 text-red-100" };
  }
  return { color: "neutral", class: "" };
});
</script>
