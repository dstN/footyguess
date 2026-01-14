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
        :disabled="hasAutoUpdate"
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
          class="cursor-pointer"
          :disabled="
            !canSubmit || !lastScore || submittedTypes.includes('round')
          "
          @click="$emit('submit', 'round')"
        >
          <span class="flex items-center justify-center gap-2">
            <UIcon
              v-if="submittedTypes.includes('round')"
              name="i-lucide-check"
              class="h-4 w-4"
            />
            <span>{{
              submittedTypes.includes("round")
                ? "Round submitted"
                : "Submit last round score"
            }}</span>
            <span class="font-mono opacity-80">({{ roundPoints }})</span>
          </span>
        </UButton>
        <UButton
          block
          color="neutral"
          variant="soft"
          size="lg"
          class="cursor-pointer"
          :disabled="!canSubmit || submittedTypes.includes('total')"
          @click="$emit('submit', 'total')"
        >
          <span class="flex items-center justify-center gap-2">
            <UIcon
              v-if="submittedTypes.includes('total')"
              name="i-lucide-refresh-cw"
              class="h-4 w-4"
            />
            <span>{{
              submittedTypes.includes("total")
                ? "Auto-updating total"
                : "Submit total score"
            }}</span>
            <span class="font-mono opacity-80">({{ totalScore }})</span>
          </span>
        </UButton>
        <UButton
          block
          color="secondary"
          size="lg"
          class="cursor-pointer"
          :disabled="!canSubmit || submittedTypes.includes('streak')"
          @click="$emit('submit', 'streak')"
        >
          <span class="flex items-center justify-center gap-2">
            <UIcon
              v-if="submittedTypes.includes('streak')"
              name="i-lucide-refresh-cw"
              class="h-4 w-4"
            />
            <span>{{
              submittedTypes.includes("streak")
                ? "Auto-updating streak"
                : "Submit best streak"
            }}</span>
            <span class="font-mono opacity-80">({{ bestStreak }})</span>
          </span>
        </UButton>
      </div>
      <p class="text-center text-xs text-slate-500">
        {{
          hasAutoUpdate
            ? "Total score & streak update automatically after each win"
            : "Enter a nickname to submit your scores"
        }}
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
    malicePenalty: number;
    playerName: string | null;
  } | null;
  totalScore: number;
  bestStreak: number;
  submittedTypes: string[];
}>();

defineEmits<{
  (e: "update:nickname", value: string): void;
  (e: "submit", type: "round" | "total" | "streak"): void;
}>();

const canSubmit = computed(() => props.nickname.trim().length > 0);

const hasAutoUpdate = computed(
  () =>
    props.submittedTypes.includes("total") ||
    props.submittedTypes.includes("streak"),
);

const roundPoints = computed(() => props.lastScore?.score ?? 0);
</script>
