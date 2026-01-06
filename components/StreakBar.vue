<template>
  <div
    class="flex flex-nowrap items-center gap-4 text-slate-100"
    role="region"
    aria-label="Current and best streak information"
  >
    <span
      class="text-mew-500 text-xs tracking-[0.18em] uppercase font-semibold"
      id="streak-label"
    >
      Streaks
    </span>
    <span
      class="text-sm font-semibold"
      role="status"
      :aria-label="`Current streak: ${streak}`"
    >
      Current <span class="text-primary-400 font-bold">{{ streak }}</span>
    </span>
    <span
      class="text-slate-400"
    >
      •
    </span>
    <span
      class="text-sm font-semibold"
      :aria-label="`Best streak: ${bestStreak}`"
    >
      Best <span class="text-mew-500 font-bold">{{ bestStreak }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  streak: number;
  bestStreak: number;
}>();
</script>
