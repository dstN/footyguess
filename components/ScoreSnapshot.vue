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
          <!-- Base × multiplier -->
          <div class="flex justify-between">
            <span class="text-slate-400">Base × multiplier</span>
            <span class="font-mono text-slate-200">{{ adjustedBase }}</span>
          </div>

          <!-- Streak bonus -->
          <div
            v-if="streakBonusPercent > 0"
            class="flex justify-between"
          >
            <span class="text-slate-400">
              Streak bonus
              <span class="text-slate-500">(+{{ streakBonusPercent }}%)</span>
            </span>
            <span class="text-mew-500 font-mono">+{{ streakBonusPoints }}</span>
          </div>

          <!-- No-clue bonus OR clue penalty -->
          <div class="flex justify-between">
            <span class="text-slate-400">
              {{ cluesUsed === 0 ? "No clues" : "Clues" }}
              <span class="text-slate-500">{{
                cluesUsed === 0
                  ? "(+10%)"
                  : `(-${Math.min(30, cluesUsed * 6)}%)`
              }}</span>
            </span>
            <span
              class="font-mono"
              :class="cluesUsed === 0 ? 'text-primary-400' : 'text-red-400'"
              >{{
                cluesUsed === 0 ? `+${noClueBonus}` : `-${cluePenalty}`
              }}</span
            >
          </div>

          <!-- No-malice bonus OR malice penalty -->
          <div class="flex justify-between">
            <span class="text-slate-400">
              {{ missedGuesses === 0 ? "No wrong guesses" : "Wrong guesses" }}
              <span class="text-slate-500">{{
                missedGuesses === 0
                  ? "(+10%)"
                  : `(-${Math.min(30, missedGuesses * 6)}%)`
              }}</span>
            </span>
            <span
              class="font-mono"
              :class="missedGuesses === 0 ? 'text-primary-400' : 'text-red-400'"
              >{{
                missedGuesses === 0 ? `+${noMaliceBonus}` : `-${malicePenalty}`
              }}</span
            >
          </div>

          <!-- Time bonus/penalty -->
          <div class="flex justify-between">
            <span class="text-slate-400">
              Time
              <span class="text-slate-500"
                >({{ timeBonusPercent >= 0 ? "+" : ""
                }}{{ timeBonusPercent }}%)</span
              >
            </span>
            <span
              class="font-mono"
              :class="
                timeBonusPoints >= 0 ? 'text-primary-400' : 'text-red-400'
              "
              >{{ timeBonusPoints >= 0 ? "+" : "" }}{{ timeBonusPoints }}</span
            >
          </div>

          <!-- Final round score -->
          <div
            class="mt-2 flex items-center justify-between border-t border-slate-700/50 pt-2"
          >
            <span class="flex items-center gap-1 font-semibold text-slate-200">
              Round score
            </span>
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
    cluesUsed?: number;
    missedGuesses?: number;
    streak: number;
    streakBonus: number;
    streakBonusPoints?: number;
    noClueBonus?: number;
    cluePenalty?: number;
    noMaliceBonus?: number;
    malicePenalty?: number;
    timeBonus?: number;
    timeBonusPoints?: number;
    playerName: string | null;
  } | null;
  totalScore: number;
  bestStreak: number;
}>();

// Base values
const adjustedBase = computed(() => props.lastScore?.baseScore ?? 0);
const cluesUsed = computed(() => props.lastScore?.cluesUsed ?? 0);
const missedGuesses = computed(() => props.lastScore?.missedGuesses ?? 0);

// Streak bonus
const streakBonusPercent = computed(() =>
  props.lastScore ? Math.round((props.lastScore.streakBonus ?? 0) * 100) : 0,
);
const streakBonusPoints = computed(() => {
  if (props.lastScore?.streakBonusPoints !== undefined) {
    return props.lastScore.streakBonusPoints;
  }
  return Math.round(adjustedBase.value * (props.lastScore?.streakBonus ?? 0));
});

// Clue bonus/penalty (all additive on adjustedBase)
const noClueBonus = computed(() => {
  if (props.lastScore?.noClueBonus !== undefined) {
    return props.lastScore.noClueBonus;
  }
  return cluesUsed.value === 0 ? Math.round(adjustedBase.value * 0.1) : 0;
});
const cluePenalty = computed(() => {
  if (props.lastScore?.cluePenalty !== undefined) {
    return props.lastScore.cluePenalty;
  }
  return cluesUsed.value > 0
    ? Math.round(adjustedBase.value * 0.06 * cluesUsed.value)
    : 0;
});

// Malice bonus/penalty (all additive on adjustedBase)
const noMaliceBonus = computed(() => {
  if (props.lastScore?.noMaliceBonus !== undefined) {
    return props.lastScore.noMaliceBonus;
  }
  return missedGuesses.value === 0 ? Math.round(adjustedBase.value * 0.1) : 0;
});
const malicePenalty = computed(() => {
  if (props.lastScore?.malicePenalty !== undefined) {
    return props.lastScore.malicePenalty;
  }
  return missedGuesses.value > 0
    ? Math.round(adjustedBase.value * 0.06 * missedGuesses.value)
    : 0;
});

// Time bonus/penalty
const timeBonusPercent = computed(() =>
  props.lastScore?.timeBonus !== undefined
    ? Math.round(props.lastScore.timeBonus * 100)
    : 0,
);
const timeBonusPoints = computed(() => props.lastScore?.timeBonusPoints ?? 0);
</script>
