<template>
  <UBadge
    v-if="potentialScore > 0"
    :color="scoreColorBadge"
    variant="soft"
    class="flex w-full items-center justify-center font-mono text-xs transition-all duration-300 sm:w-auto"
    :class="{
      'animate-penalty-pulse': isPenaltyActive,
      'animate-event-pulse': triggerEventAnim,
    }"
    :title="`Potential score (${elapsedDisplay})`"
  >
    ~{{ potentialScore.toFixed(3) }} pts
  </UBadge>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import {
  BASE_POINTS,
  GRACE_SECONDS_PER_TRANSFER,
  MAX_GRACE_SECONDS,
} from "~/utils/scoring-constants";
import type { DifficultyInfo } from "~/types/player";

const props = withDefaults(
  defineProps<{
    difficulty: DifficultyInfo | null;
    startedAt?: number; // Unix timestamp (seconds)
    transferCount?: number;
    cluesUsed?: number;
    wrongGuesses?: number;
    streak?: number;
  }>(),
  {
    startedAt: 0,
    transferCount: 0,
    cluesUsed: 0,
    wrongGuesses: 0,
    streak: 0,
  },
);

const elapsedSeconds = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

// Calculate grace seconds: 5s per transfer, max 30s
const graceSeconds = computed(() =>
  Math.min(
    MAX_GRACE_SECONDS,
    (props.transferCount ?? 0) * GRACE_SECONDS_PER_TRANSFER,
  ),
);

// Effective elapsed after grace period
const effectiveElapsed = computed(() =>
  Math.max(0, elapsedSeconds.value - graceSeconds.value),
);

// Format elapsed time for display
const elapsedDisplay = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60);
  const secs = elapsedSeconds.value % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
});

// Calculate adjusted base for color thresholds
const adjustedBase = computed(() => {
  if (!props.difficulty) return 100;
  return BASE_POINTS * (props.difficulty.multiplier ?? 1);
});

// Calculate potential score using client-side formula
const potentialScore = computed(() => {
  if (!props.difficulty) return 0;

  const base = adjustedBase.value;

  // Streak bonus: +5% to +30%
  const streakBonus = getStreakBonusMultiplier(props.streak);
  const streakBonusPoints = Math.round(base * streakBonus);

  // Clue bonus/penalty (6% each, capped at 30%)
  const noClueBonus = props.cluesUsed === 0 ? Math.round(base * 0.1) : 0;
  const cluePenalty =
    props.cluesUsed > 0
      ? Math.round(base * Math.min(0.3, 0.06 * props.cluesUsed))
      : 0;

  // Malice bonus/penalty (6% each, capped at 30%)
  const noMaliceBonus = props.wrongGuesses === 0 ? Math.round(base * 0.1) : 0;
  const malicePenalty =
    props.wrongGuesses > 0
      ? Math.round(base * Math.min(0.3, 0.06 * props.wrongGuesses))
      : 0;

  // Time bonus/penalty (capped at -30%)
  const timeBonus = Math.max(-0.3, getTimeBonus(effectiveElapsed.value));
  // Don't round time bonus for live display (floating point adds drama)
  const timeBonusPoints = base * timeBonus;

  const score = Math.max(
    base +
      streakBonusPoints +
      noClueBonus -
      cluePenalty +
      noMaliceBonus -
      malicePenalty +
      timeBonusPoints,
    1,
  );

  // Return fixed string for display or number?
  // Computed expects number usually, but we can return number here and format in template
  return score;
});

// Color zones based on score relative to adjusted base:
// - Green (success): above 145% of base (base + 45%)
// - Orange/warning: 75% to 145% of base
// - Red (error): below 75% of base
const scoreColorBadge = computed<"success" | "warning" | "error">(() => {
  const base = adjustedBase.value;
  const score = potentialScore.value;

  // Above 145% of base = green
  if (score >= base * 1.45) return "success";
  // Above 75% of base = orange/warning
  if (score >= base * 0.75) return "warning";
  // Below 75% = red
  return "error";
});

function getStreakBonusMultiplier(streak: number): number {
  if (streak >= 100) return 0.3;
  if (streak >= 60) return 0.2;
  if (streak >= 30) return 0.15;
  if (streak >= 15) return 0.1;
  if (streak >= 5) return 0.05;
  return 0;
}

function getTimeBonus(elapsed: number): number {
  if (elapsed <= 1) return 1.2;
  if (elapsed <= 120) {
    const progress = (elapsed - 1) / (120 - 1);
    return 1.2 * (1 - progress);
  }
  if (elapsed <= 300) return 0;
  // -0.1% per second after 5min, max -30%
  const secondsAfter5min = elapsed - 300;
  const penalty = 0.001 * secondsAfter5min;
  return -1 * Math.min(0.3, penalty);
}

function updateElapsed() {
  if (props.startedAt > 0) {
    // precision: floating point seconds
    elapsedSeconds.value = Math.max(0, Date.now() / 1000 - props.startedAt);
  }
}

onMounted(() => {
  updateElapsed();
  // Update frequently for stop-clock effect (50ms = 20fps)
  timer = setInterval(updateElapsed, 50);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// Reset when round changes
watch(
  () => props.startedAt,
  () => {
    updateElapsed();
  },
);

// Penalty active state (> 5 min)
const isPenaltyActive = computed(() => effectiveElapsed.value > 300);

// Animation trigger for events
const triggerEventAnim = ref(false);

function pulseEvent() {
  triggerEventAnim.value = true;
  setTimeout(() => {
    triggerEventAnim.value = false;
  }, 400);
}

// Watch for score-impacting events
watch(
  [() => props.cluesUsed, () => props.wrongGuesses, scoreColorBadge],
  () => {
    pulseEvent();
  },
);
</script>

<style scoped>
@keyframes penalty-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes event-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    transform: scale(1.15);
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

.animate-penalty-pulse {
  animation: penalty-pulse 1.5s infinite ease-in-out;
}

.animate-event-pulse {
  animation: event-pulse 0.4s ease-out forwards;
}

@media (prefers-reduced-motion) {
  .animate-penalty-pulse,
  .animate-event-pulse {
    animation: none !important;
  }
}
</style>
