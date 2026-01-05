<template>
  <UCard class="border-primary-900/40 border bg-slate-950/60">
    <template #header>
      <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
        Submit to leaderboard
      </p>
    </template>
    <div class="space-y-3">
      <UInput
        :model-value="nickname"
        placeholder="Nickname"
        size="lg"
        :ui="{
          base: 'bg-white/5 border border-primary-900/50 text-slate-100 placeholder:text-slate-400/70 backdrop-blur-sm',
        }"
        @update:model-value="$emit('update:nickname', $event)"
      />
      <div class="flex flex-col gap-2">
        <UButton
          block
          color="primary"
          :disabled="!canSubmit || !lastScore"
          @click="$emit('submit', 'round')"
        >
          Submit last round score ({{ lastBaseWithTime }})
        </UButton>
        <UButton
          block
          color="neutral"
          :disabled="!canSubmit"
          @click="$emit('submit', 'total')"
        >
          Submit total score ({{ totalScore }})
        </UButton>
        <UButton
          block
          color="secondary"
          :disabled="!canSubmit"
          @click="$emit('submit', 'streak')"
        >
          Submit best streak ({{ bestStreak }})
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  nickname: string;
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

defineEmits<{
  (e: "update:nickname", value: string): void;
  (e: "submit", type: "round" | "total" | "streak"): void;
}>();

const canSubmit = computed(() => props.nickname.trim().length > 0);

const lastBaseWithTime = computed(() =>
  props.lastScore
    ? Math.round(
        (props.lastScore.baseScore ?? 0) *
          (props.lastScore.timeMultiplier ?? 1),
      )
    : 0,
);
</script>
