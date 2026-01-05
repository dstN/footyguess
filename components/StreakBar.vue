<template>
  <div
    class="border-primary-900/60 flex flex-wrap items-center gap-3 rounded-2xl border bg-slate-900/60 px-3 py-3 text-slate-100"
    role="region"
    aria-label="Current and best streak information"
  >
    <p
      class="text-primary-200 text-xs tracking-[0.18em] uppercase"
      id="streak-label"
    >
      Streaks
    </p>
    <UBadge
      color="primary"
      variant="soft"
      class="bg-primary-500/10 text-sm font-semibold"
      role="status"
      :aria-label="`Current streak: ${streak}`"
    >
      Current <span class="text-primary-300 font-bold">{{ streak }}</span>
    </UBadge>
    <UBadge
      color="neutral"
      variant="soft"
      class="text-sm font-semibold"
      :aria-label="`Best streak: ${bestStreak}`"
    >
      Best <span class="font-bold">{{ bestStreak }}</span>
    </UBadge>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  streak: number;
  bestStreak: number;
}>();
</script>
