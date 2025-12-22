<template>
  <main class="flex flex-1 items-center justify-center">
    <UCard class="w-full max-w-xl border border-primary-900/50 bg-slate-950/70 text-center">
      <div class="flex flex-col items-center gap-3">
        <UIcon
          name="i-lucide-party-popper"
          class="text-4xl text-primary-200"
        />
        <h1 class="text-3xl font-bold text-white">
          You cracked the code!
        </h1>
        <p class="text-slate-300">
          The mystery player is yours. Spin up another cyber round and keep the streak alive.
        </p>
        <div class="flex items-center gap-2 text-sm text-slate-200">
          <UBadge color="primary" variant="soft">Streak: {{ streak }}</UBadge>
          <UBadge color="neutral" variant="soft">Best: {{ bestStreak }}</UBadge>
        </div>
        <p v-if="lastPlayer" class="text-sm text-slate-400">
          Last win: {{ lastPlayer }}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton to="/play" color="primary" icon="i-lucide-shuffle">
            New mystery
          </UButton>
          <UButton to="/" variant="ghost" color="neutral">
            Back home
          </UButton>
        </div>
      </div>
    </UCard>
  </main>
</template>

<script setup lang="ts">
const streak = ref(0);
const bestStreak = ref(0);
const lastPlayer = ref<string | null>(null);

onMounted(() => {
  if (import.meta.client) {
    const stored = Number.parseInt(
      localStorage.getItem("footyguess_streak") || "0",
      10,
    );
    const storedBest = Number.parseInt(
      localStorage.getItem("footyguess_best_streak") || "0",
      10,
    );
    streak.value = Number.isFinite(stored) ? stored : 0;
    bestStreak.value = Number.isFinite(storedBest) ? storedBest : 0;
    lastPlayer.value = localStorage.getItem("footyguess_last_player");
  }
});
</script>
