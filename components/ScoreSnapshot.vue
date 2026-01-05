<template>
  <UCard class="border-primary-900/50 border bg-slate-950/60">
    <template #header>
      <p class="text-primary-200/80 text-xs tracking-[0.26em] uppercase">
        Score snapshot
      </p>
    </template>
    <div class="space-y-4 text-slate-100">
      <!-- Last round breakdown -->
      <div v-if="lastScore">
        <p class="text-primary-200/80 mb-3 text-xs tracking-[0.18em] uppercase">
          This round
        </p>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-400">Base points</span>
            <span class="font-mono text-slate-200">{{ lastScore.baseScore }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">
              Time bonus
              <span class="text-slate-500">({{ timeBonusPercent }}%)</span>
            </span>
            <span class="font-mono text-emerald-400">+{{ timeBonus }}</span>
          </div>
          <div class="mt-2 border-t border-slate-700/50 pt-2">
            <div class="flex justify-between">
              <span class="text-slate-300">Round points</span>
              <span class="font-mono text-slate-200">{{ lastBaseWithTime }}</span>
            </div>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">
              Streak bonus
              <span class="text-slate-500">({{ streakBonusPercent }}%)</span>
            </span>
            <span class="text-mew-500 font-mono">+{{ streakBonusPoints }}</span>
          </div>
          <div class="mt-2 flex items-center justify-between border-t border-slate-700/50 pt-2">
            <span class="font-semibold text-slate-200">Total</span>
            <span
              class="text-primary-400 font-mono text-lg font-bold"
              data-testid="score"
            >
              {{ lastScore.score }}
            </span>
          </div>
        </div>
      </div>

      <!-- Session totals -->
      <div class="flex gap-4 border-t border-slate-700/50 pt-4">
        <div class="flex-1 text-center">
          <p class="text-xs tracking-wide text-slate-500 uppercase">Session</p>
          <p class="font-mono text-xl font-bold text-slate-100">
            {{ totalScore }}
          </p>
        </div>
        <div class="flex-1 text-center">
          <p class="text-xs tracking-wide text-slate-500 uppercase">
            Best Streak
          </p>
          <p
            class="text-mew-500 font-mono text-xl font-bold"
            data-testid="streak"
          >
            {{ bestStreak }}
          </p>
        </div>
      </div>
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

const timeBonusPercent = computed(() =>
  props.lastScore ? Math.round((props.lastScore.timeMultiplier - 1) * 100) : 0,
);

const timeBonus = computed(() =>
  props.lastScore
    ? Math.round(
        props.lastScore.baseScore * (props.lastScore.timeMultiplier - 1),
      )
    : 0,
);

const streakBonusPercent = computed(() =>
  props.lastScore ? Math.round(props.lastScore.streakBonus * 100) : 0,
);

const streakBonusPoints = computed(() =>
  props.lastScore ? props.lastScore.score - lastBaseWithTime.value : 0,
);
</script>
