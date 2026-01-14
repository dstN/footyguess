<template>
  <UPopover
    v-if="difficulty"
    :content="{ side: 'bottom', align: 'start' }"
    :ui="{
      content: 'bg-transparent shadow-none ring-0 border-0',
    }"
  >
    <div class="flex cursor-help items-center gap-1">
      <UBadge
        :color="badge.color"
        variant="soft"
        class="text-xs"
        :class="badge.class"
      >
        {{ label }}
      </UBadge>
      <UIcon
        name="i-lucide-help-circle"
        class="h-4 w-4 text-slate-500 transition-colors hover:text-slate-300"
      />
    </div>

    <template #content>
      <div
        class="border-primary-500/30 max-w-xs space-y-2 rounded-2xl border bg-white/5 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xs"
      >
        <div class="font-medium text-white">{{ label }} Difficulty</div>
        <div class="text-xs text-slate-300">
          <div>
            Base: {{ difficulty.basePoints }} pts ×
            {{ difficulty.multiplier }} =
            <span class="text-white">{{ maxPoints }} pts max</span>
          </div>
          <div
            v-if="streakBonusPct > 0"
            class="mt-1"
          >
            Streak bonus: +{{ streakBonusPct }}% → up to
            <span class="text-mew-500">{{ potentialWithStreak }} pts</span>
          </div>
        </div>
        <div class="border-t border-slate-600 pt-2 text-xs text-slate-400">
          <div>Easy: 1× • Medium: 2×</div>
          <div>Hard: 3× • Ultra: 4×</div>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getStreakBonusMultiplier } from "~/server/utils/scoring";
import type { DifficultyInfo } from "~/types/player";

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
</script>
