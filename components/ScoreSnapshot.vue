<template>
  <UCard class="border-primary-900/40 border bg-slate-950/60">
    <template #header>
      <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
        Score snapshot
      </p>
    </template>
    <div class="space-y-2 text-slate-100">
      <p
        v-if="lastScore"
        class="text-sm"
      >
        <span class="font-semibold">Last round:</span>
        {{ lastBaseWithTime }} base+time →
        <span class="text-primary-200">{{ lastScore.score }}</span> total
      </p>
      <p
        v-if="lastScore"
        class="text-xs text-slate-400"
      >
        Time bonus:
        {{ Math.round((lastScore.timeMultiplier - 1) * 100) }}% · Streak
        bonus: {{ Math.round(lastScore.streakBonus * 100) }}%
      </p>
      <p class="text-sm">
        <span class="font-semibold">Total score:</span>
        {{ totalScore }}
      </p>
      <p class="text-sm">
        <span class="font-semibold">Best streak:</span>
        {{ bestStreak }}
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  lastScore: {
    score: number;
    baseScore: number;
    streak: number;
    streakBonus: number;
    timeMultiplier: number;
    playerName: string | null;
  } | null;
  totalScore: number;
  bestStreak: number;
}>();

const lastBaseWithTime = computed(() =>
  props.lastScore
    ? Math.round(
        (props.lastScore.baseScore ?? 0) *
          (props.lastScore.timeMultiplier ?? 1),
      )
    : 0,
);
</script>
