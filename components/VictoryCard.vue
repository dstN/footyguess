<template>
  <UCard
    class="border-primary-900/50 w-full border bg-slate-950/70 text-center"
  >
    <div class="flex flex-col items-center gap-3">
      <UIcon
        name="i-lucide-party-popper"
        class="text-primary-200 text-4xl"
      />
      <h1 class="text-3xl font-bold text-white">You cracked the code!</h1>
      <p class="text-slate-300">
        Keep the run going or drop your score on the board.
      </p>
      <div class="flex items-center gap-2 text-sm text-slate-200">
        <UBadge
          color="primary"
          variant="soft"
          >Streak: {{ streak }}</UBadge
        >
        <UBadge
          color="neutral"
          variant="soft"
          >Best: {{ bestStreak }}</UBadge
        >
      </div>
      <p
        v-if="lastPlayer"
        class="text-sm text-slate-400"
      >
        Last win:
        <a
          v-if="lastPlayerTmUrl"
          :href="lastPlayerTmUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-400 hover:text-primary-300 underline"
        >
          {{ lastPlayer }}
        </a>
        <span v-else>{{ lastPlayer }}</span>
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <UButton
          to="/play"
          color="primary"
          icon="i-lucide-shuffle"
          class="cursor-pointer"
        >
          New mystery
        </UButton>
        <UButton
          to="/"
          variant="ghost"
          color="neutral"
          class="cursor-pointer"
        >
          Back home
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  streak: number;
  bestStreak: number;
  lastPlayer: string | null;
  lastPlayerTmUrl: string | null;
}>();
</script>
