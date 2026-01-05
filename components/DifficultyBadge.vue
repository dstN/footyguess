<template>
  <UTooltip
    v-if="difficulty"
    :text="tooltipText"
    :popper="{ placement: 'bottom' }"
  >
    <UBadge
      :color="badge.color"
      variant="soft"
      class="text-xs"
      :class="badge.class"
    >
      {{ label }}
    </UBadge>
  </UTooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface DifficultyInfo {
  tier: "easy" | "medium" | "hard" | "ultra";
  multiplier: number;
  basePoints: number;
}

const props = defineProps<{
  difficulty: DifficultyInfo | null;
  currentStreak?: number;
}>();

/**
 * Get difficulty label from tier
 */
const label = computed(() => {
  switch (props.difficulty?.tier) {
    case "easy":
      return "Easy";
    case "medium":
      return "Medium";
    case "hard":
      return "Hard";
    case "ultra":
      return "Ultra";
    default:
      return "";
  }
});

/**
 * Calculate maximum points with current difficulty
 */
const maxPoints = computed(() =>
  props.difficulty
    ? Math.round(props.difficulty.basePoints * props.difficulty.multiplier)
    : 0,
);

/**
 * Get streak bonus multiplier based on streak count
 */
function getStreakBonusMultiplier(streak: number) {
  if (streak >= 100) return 0.3;
  if (streak >= 60) return 0.2;
  if (streak >= 30) return 0.15;
  if (streak >= 15) return 0.1;
  if (streak >= 5) return 0.05;
  return 0;
}

/**
 * Calculate streak bonus as percentage
 */
const streakBonusPct = computed(() =>
  Number((getStreakBonusMultiplier(props.currentStreak ?? 0) * 100).toFixed(0)),
);

/**
 * Calculate maximum points with streak bonus
 */
const potentialWithStreak = computed(() =>
  props.difficulty
    ? Math.round(
        props.difficulty.basePoints *
          props.difficulty.multiplier *
          (1 + getStreakBonusMultiplier(props.currentStreak ?? 0)),
      )
    : 0,
);

/**
 * Badge color and styling based on difficulty tier
 */
const badge = computed<{
  color: "success" | "warning" | "error" | "neutral";
  class: string;
}>(() => {
  if (!props.difficulty) return { color: "neutral", class: "" };
  switch (props.difficulty.tier) {
    case "easy":
      return { color: "success", class: "bg-green-500/10 text-green-100" };
    case "medium":
      return { color: "warning", class: "bg-yellow-500/10 text-yellow-100" };
    case "hard":
      return { color: "warning", class: "bg-orange-500/10 text-orange-100" };
    case "ultra":
      return { color: "error", class: "bg-red-500/10 text-red-100" };
    default:
      return { color: "neutral", class: "" };
  }
});

/**
 * Build tooltip text with difficulty and scoring information
 */
const tooltipText = computed(
  () =>
    `Difficulty: ${label.value} — Base max ${maxPoints.value} pts; with current streak bonus (${streakBonusPct.value}%): up to ${potentialWithStreak.value} pts.`,
);
</script>
