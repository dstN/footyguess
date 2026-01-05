<template>
  <UCard class="border-primary-900/50 border bg-slate-950/60">
    <template #header>
      <p class="text-primary-200/80 text-xs tracking-[0.18em] uppercase">
        Submit to leaderboard
      </p>
    </template>
    <div class="space-y-4">
      <UInput
        :model-value="nickname"
        placeholder="Nickname"
        size="lg"
        class="w-full"
        :ui="{
          base: 'w-full bg-white/5 border border-primary-900/50 text-slate-100 placeholder:text-slate-400/70 backdrop-blur-sm',
        }"
        @update:model-value="$emit('update:nickname', $event)"
      />
      <div class="flex flex-col gap-3">
        <UButton
          block
          color="primary"
          size="lg"
          :disabled="!canSubmit || !lastScore"
          @click="$emit('submit', 'round')"
        >
          <span class="flex items-center justify-center gap-2">
            <span>Submit last round score</span>
            <span class="font-mono opacity-80">({{ lastBaseWithTime }})</span>
          </span>
        </UButton>
        <UButton
          block
          color="neutral"
          variant="soft"
          size="lg"
          :disabled="!canSubmit"
          @click="$emit('submit', 'total')"
        >
          <span class="flex items-center justify-center gap-2">
            <span>Submit total score</span>
            <span class="font-mono opacity-80">({{ totalScore }})</span>
          </span>
        </UButton>
        <UButton
          block
          color="secondary"
          size="lg"
          :disabled="!canSubmit"
          @click="$emit('submit', 'streak')"
        >
          <span class="flex items-center justify-center gap-2">
            <span>Submit best streak</span>
            <span class="font-mono opacity-80">({{ bestStreak }})</span>
          </span>
        </UButton>
      </div>
      <p class="text-center text-xs text-slate-500">
        Enter a nickname to submit your scores
      </p>
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
