<template>
  <div
    class="border-primary-900/60 flex flex-wrap items-center gap-3 rounded-2xl border bg-slate-900/60 px-3 py-3 text-slate-100"
  >
    <p class="text-xs uppercase tracking-[0.18em] text-primary-200">
      Streaks
    </p>
    <UBadge color="primary" variant="soft" class="bg-primary-500/10 text-sm font-semibold">
      Current {{ streak }}
    </UBadge>
    <UBadge color="neutral" variant="soft" class="text-sm font-semibold">
      Best {{ bestStreak }}
    </UBadge>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  streak: number;
  bestStreak: number;
}>();
</script>
