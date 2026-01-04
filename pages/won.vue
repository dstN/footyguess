<template>
  <main class="flex flex-1 items-center justify-center">
    <div class="w-full max-w-3xl space-y-6">
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
            Last win: {{ lastPlayer }}
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <UButton
              to="/play"
              color="primary"
              icon="i-lucide-shuffle"
            >
              New mystery
            </UButton>
            <UButton
              to="/"
              variant="ghost"
              color="neutral"
            >
              Back home
            </UButton>
          </div>
        </div>
      </UCard>

      <div class="grid gap-4 md:grid-cols-2">
        <UCard class="border-primary-900/40 border bg-slate-950/60">
          <template #header>
            <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
              Score snapshot
            </p>
          </template>
          <div class="space-y-2 text-slate-100">
            <p
              v-if="lastScore"
              class="text-sm"
            >
              <span class="font-semibold">Last round:</span>
              {{ lastBaseWithTime }} base+time →
              <span class="text-primary-200">{{ lastScore.score }}</span> total
            </p>
            <p
              v-if="lastScore"
              class="text-xs text-slate-400"
            >
              Time bonus:
              {{ Math.round((lastScore.timeMultiplier - 1) * 100) }}% · Streak
              bonus: {{ Math.round(lastScore.streakBonus * 100) }}%
            </p>
            <p class="text-sm">
              <span class="font-semibold">Total score:</span>
              {{ totalScore }}
            </p>
            <p class="text-sm">
              <span class="font-semibold">Best streak:</span>
              {{ bestStreak }}
            </p>
          </div>
        </UCard>

        <UCard class="border-primary-900/40 border bg-slate-950/60">
          <template #header>
            <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
              Submit to leaderboard
            </p>
          </template>
          <div class="space-y-3">
            <UInput
              v-model="nickname"
              placeholder="Nickname"
              size="lg"
              :ui="{
                base: 'bg-white/5 border border-primary-900/50 text-slate-100 placeholder:text-slate-400/70 backdrop-blur-sm',
              }"
            />
            <div class="flex flex-col gap-2">
              <UButton
                block
                color="primary"
                :disabled="!canSubmit || !lastScore"
                @click="submit('round')"
              >
                Submit last round score ({{ lastBaseWithTime }})
              </UButton>
              <UButton
                block
                color="neutral"
                :disabled="!canSubmit"
                @click="submit('total')"
              >
                Submit total score ({{ totalScore }})
              </UButton>
              <UButton
                block
                color="secondary"
                :disabled="!canSubmit"
                @click="submit('streak')"
              >
                Submit best streak ({{ bestStreak }})
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const streak = ref(0);
const bestStreak = ref(0);
const lastPlayer = ref<string | null>(null);
const totalScore = ref(0);
const lastScore = ref<{
  score: number;
  baseScore: number;
  streak: number;
  streakBonus: number;
  timeMultiplier: number;
  playerName: string | null;
} | null>(null);
const nickname = ref("");
const sessionId = ref<string | null>(null);

const canSubmit = computed(() => nickname.value.trim().length > 0);

const lastBaseWithTime = computed(() =>
  lastScore.value
    ? Math.round(
        (lastScore.value.baseScore ?? 0) *
          (lastScore.value.timeMultiplier ?? 1),
      )
    : 0,
);

async function fetchStats() {
  if (!sessionId.value) return;
  try {
    const res = await $fetch<{
      streak: number;
      bestStreak: number;
      totalScore: number;
      lastScore: {
        score: number;
        baseScore: number;
        streak: number;
        streakBonus: number;
        timeMultiplier: number;
        playerName: string | null;
      } | null;
      nickname: string | null;
    }>(`/api/sessionStats?sessionId=${encodeURIComponent(sessionId.value)}`);
    streak.value = res.streak ?? streak.value;
    bestStreak.value = res.bestStreak ?? bestStreak.value;
    totalScore.value = res.totalScore ?? 0;
    lastScore.value = res.lastScore;
    if (res.nickname) nickname.value = res.nickname;
  } catch (err) {
    console.error("Failed to load session stats", err);
  }
}

async function submit(type: "round" | "total" | "streak") {
  if (!sessionId.value) return;
  try {
    await $fetch("/api/submitScore", {
      method: "POST",
      body: {
        sessionId: sessionId.value,
        nickname: nickname.value,
        type,
      },
    });
    useToast().add({
      title: "Submitted",
      description: `Added your ${type} to the leaderboard`,
      color: "primary",
    });
  } catch (err) {
    console.error("Submit score failed", err);
    useToast().add({
      title: "Submit failed",
      description: "Please try again",
      color: "error",
    });
  }
}

onMounted(() => {
  if (import.meta.client) {
    sessionId.value = localStorage.getItem("footyguess_session_id");
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
    fetchStats();
  }
});
</script>
