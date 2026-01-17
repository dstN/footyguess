<template>
  <ErrorBoundary>
    <main class="space-y-6">
      <!-- Hero Card -->
      <UCard
        class="border-primary-900/50 relative w-full overflow-hidden border bg-slate-950/60"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_32%)]"
        />
        <div
          class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <UBadge
                color="primary"
                variant="soft"
                class="tracking-[0.22em] uppercase"
              >
                Footyguess
              </UBadge>
            </div>
            <h1 class="text-3xl font-bold text-white sm:text-4xl">
              Guess the player from their transfer trail.
            </h1>
            <p class="max-w-xl text-slate-300">
              A football riddle. Inspect the club timeline, unlock random clues,
              and see if you can name the mystery baller.
            </p>
          </div>

          <div class="flex flex-col items-start gap-3 sm:items-end">
            <UButton
              color="primary"
              size="xl"
              icon="i-lucide-play"
              class="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-[0_0_24px_rgba(14,249,174,0.4)] sm:h-20 sm:w-20 sm:flex-col sm:rounded-2xl sm:text-sm"
              @click="handlePlayClick"
            >
              <span class="sm:hidden">Play now</span>
              <span class="hidden sm:block">Play</span>
            </UButton>

            <!-- Hidden DifficultySelector - opened programmatically -->
            <DifficultySelector
              ref="difficultySelectorRef"
              v-model="selectedDifficulty"
              @confirm="handleDifficultyConfirm"
            >
              <template #default>
                <span class="hidden" />
              </template>
            </DifficultySelector>
          </div>
        </div>
      </UCard>

      <!-- How to Play Card -->
      <UCard
        class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-book-open"
              class="text-primary-400 h-5 w-5"
            />
            <h2 class="text-lg font-semibold text-white">How to Play</h2>
          </div>
        </template>

        <div class="grid gap-6 md:grid-cols-2">
          <!-- Left: Game steps -->
          <div class="space-y-4">
            <div class="flex gap-3">
              <div
                class="bg-primary-500/20 text-primary-300 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              >
                1
              </div>
              <div>
                <h3 class="font-medium text-white">Study the Timeline</h3>
                <p class="text-sm text-slate-400">
                  Examine the player's transfer history — clubs and dates are
                  revealed, but not the name.
                </p>
              </div>
            </div>

            <div class="flex gap-3">
              <div
                class="bg-primary-500/20 text-primary-300 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              >
                2
              </div>
              <div>
                <h3 class="font-medium text-white">Use Clues Wisely</h3>
                <p class="text-sm text-slate-400">
                  Click "Get a tip" to reveal random hints like nationality,
                  position, or stats. Each clue costs 6% of your score!
                </p>
              </div>
            </div>

            <div class="flex gap-3">
              <div
                class="bg-primary-500/20 text-primary-300 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              >
                3
              </div>
              <div>
                <h3 class="font-medium text-white">Make Your Guess</h3>
                <p class="text-sm text-slate-400">
                  Search for the player and submit. Correct guesses build your
                  streak for bonus points!
                </p>
              </div>
            </div>
          </div>

          <!-- Right: Scoring summary -->
          <div class="space-y-3">
            <h3 class="flex items-center gap-2 font-medium text-white">
              <UIcon
                name="i-lucide-trophy"
                class="h-4 w-4 text-yellow-400"
              />
              Scoring Basics
            </h3>

            <div class="space-y-2 text-sm">
              <div
                class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-white/5 px-3 py-2"
              >
                <span class="flex items-center gap-2 text-slate-300">
                  <UIcon
                    name="i-lucide-gauge"
                    class="h-4 w-4 text-yellow-400"
                  />
                  Difficulty
                </span>
                <span class="text-slate-400">1× to 4× multiplier</span>
              </div>

              <div
                class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-white/5 px-3 py-2"
              >
                <span class="flex items-center gap-2 text-slate-300">
                  <UIcon
                    name="i-lucide-timer"
                    class="h-4 w-4 text-blue-400"
                  />
                  Speed Bonus
                </span>
                <span class="text-slate-400"
                  >+120% to -30% · Max Grace 15s</span
                >
              </div>

              <div
                class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-white/5 px-3 py-2"
              >
                <span class="flex items-center gap-2 text-slate-300">
                  <UIcon
                    name="i-lucide-flame"
                    class="h-4 w-4 text-orange-400"
                  />
                  Streak Bonus
                </span>
                <span class="text-slate-400">Up to +30%</span>
              </div>

              <div
                class="flex items-center justify-between rounded-lg border border-slate-700/50 bg-white/5 px-3 py-2"
              >
                <span class="flex items-center gap-2 text-slate-300">
                  <UIcon
                    name="i-lucide-lightbulb"
                    class="h-4 w-4 text-purple-400"
                  />
                  Clues
                </span>
                <span class="text-slate-400"
                  >None: <span class="text-emerald-400">+10%</span> · Each:
                  <span class="text-red-400">-6%</span></span
                >
              </div>

              <div
                class="flex items-center justify-between rounded-lg border border-red-700/30 bg-red-900/10 px-3 py-2"
              >
                <span class="flex items-center gap-2 text-slate-300">
                  <UIcon
                    name="i-lucide-zap"
                    class="h-4 w-4 text-red-400"
                  />
                  Errors
                </span>
                <span class="text-slate-400"
                  >None: <span class="text-emerald-400">+10%</span> · Each:
                  <span class="text-red-400">-6%</span></span
                >
              </div>
            </div>

            <div class="pt-2">
              <HelpModal
                button-label="Full Scoring Details"
                button-variant="soft"
                button-color="primary"
                button-size="sm"
                :show-label="true"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Footer with actions -->
      <div class="flex items-center justify-center gap-3">
        <HighscoreModal button-color="primary" />
        <UButton
          color="primary"
          variant="ghost"
          icon="i-lucide-coffee"
          class="cursor-pointer"
          to="https://ko-fi.com/dstn"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee"
        >
          <span class="hidden md:inline">Buy me a coffee</span>
        </UButton>
        <HelpModal
          button-label="How to Play"
          button-variant="ghost"
          button-color="primary"
          button-size="md"
        />
        <ChangelogModal
          button-label="Updates"
          button-variant="ghost"
          button-color="neutral"
          button-size="md"
        />
      </div>
    </main>
  </ErrorBoundary>

  <!-- Game Continuation Modal -->
  <UModal
    v-model:open="showGameChoiceModal"
    title="Continue Your Run?"
    :description="`You have an active ${currentStreak}-game streak on ${getDifficultyLabel(persistedDifficulty)} difficulty.`"
  >
    <!-- Hidden trigger -->
    <template #default>
      <span class="hidden" />
    </template>

    <template #body>
      <p class="text-sm text-slate-400">
        Would you like to continue your current run or start fresh with a new
        difficulty?
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          class="cursor-pointer"
          @click="chooseNewDifficulty"
        >
          New Game
        </UButton>
        <UButton
          color="primary"
          class="cursor-pointer"
          icon="i-lucide-play"
          @click="continueLastGame"
        >
          Proceed
        </UButton>
      </div>
    </template>
  </UModal>
  <!-- Expired Session Modal -->
  <UModal
    v-model:open="showExpiredSessionModal"
    title="Session Expired"
    description="Oooh. Sorry. It seems your session expired."
  >
    <template #default>
      <span class="hidden" />
    </template>
    <template #body>
      <div class="space-y-4 text-center">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/50"
        >
          <UIcon
            name="i-lucide-ghost"
            class="h-8 w-8 text-orange-400"
          />
        </div>
        <p class="text-slate-300">Wanna start a new game?</p>
      </div>
    </template>
    <template #footer>
      <UButton
        block
        size="lg"
        color="primary"
        class="cursor-pointer"
        @click="handleExpiredSessionConfirm"
      >
        Start New Game
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ErrorBoundary from "~/components/ErrorBoundary.vue";
import HighscoreModal from "~/components/HighscoreModal.vue";
import HelpModal from "~/components/HelpModal.vue";
import ChangelogModal from "~/components/ChangelogModal.vue";
import DifficultySelector from "~/components/DifficultySelector.vue";
import type { UserSelectedDifficulty } from "~/types/player";

const router = useRouter();
const selectedDifficulty = ref<UserSelectedDifficulty>("default");
const difficultySelectorRef = ref<InstanceType<
  typeof DifficultySelector
> | null>(null);

// Check for persisted game state
const persistedDifficulty = computed(() => {
  if (import.meta.client) {
    const stored = localStorage.getItem("footyguess_difficulty");
    if (
      stored &&
      ["default", "easy", "medium", "hard", "ultra"].includes(stored)
    ) {
      return stored as UserSelectedDifficulty;
    }
  }
  return null;
});

const currentStreak = computed(() => {
  if (import.meta.client) {
    const stored = Number.parseInt(
      localStorage.getItem("footyguess_streak") || "0",
      10,
    );
    return Number.isFinite(stored) ? stored : 0;
  }
  return 0;
});

// Modal state for game continuation choice
const showGameChoiceModal = ref(false);
const showExpiredSessionModal = ref(false);

/**
 * Get human-readable difficulty label
 */
function getDifficultyLabel(difficulty: UserSelectedDifficulty | null): string {
  if (!difficulty) return "Default";
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

/**
 * Handle play button click - show choice modal if user has active streak
 */
async function handlePlayClick() {
  if (currentStreak.value > 0) {
    // Verify session still exists on server (could be reset)
    const sessionId = localStorage.getItem("footyguess_session_id");
    if (sessionId) {
      try {
        const stats = await $fetch<{ exists: boolean }>(
          `/api/sessionStats?sessionId=${sessionId}`,
        );
        if (!stats.exists) {
          // Session deleted on server - show expired modal
          showExpiredSessionModal.value = true;
          return;
        }
      } catch (e) {
        // If check fails, assume session might be valid or let play logic handle errors
        console.error("Session check failed", e);
      }
    }
    showGameChoiceModal.value = true;
  } else {
    // No active streak, show difficulty selector directly
    difficultySelectorRef.value?.open();
  }
}

function handleExpiredSessionConfirm() {
  if (import.meta.client) {
    localStorage.removeItem("footyguess_session_id");
    localStorage.removeItem("footyguess_streak");
    localStorage.removeItem("footyguess_last_player");
  }
  showExpiredSessionModal.value = false;
  difficultySelectorRef.value?.open();
}

/**
 * Continue with last game
 */
function continueLastGame() {
  showGameChoiceModal.value = false;
  router.push({
    path: "/play",
    query: { difficulty: persistedDifficulty.value! },
  });
}

/**
 * Choose new difficulty
 */
function chooseNewDifficulty() {
  showGameChoiceModal.value = false;
  difficultySelectorRef.value?.open();
}

/**
 * Handle difficulty selection confirmation - navigate to play with selected difficulty
 * This is called when user chooses "New Game" - starts fresh session
 */
function handleDifficultyConfirm(difficulty: UserSelectedDifficulty) {
  // Clear persisted session to ensure fresh start
  if (import.meta.client) {
    localStorage.removeItem("footyguess_session_id");
  }
  router.push({
    path: "/play",
    query: { difficulty, newGame: "true" },
  });
}

useSeoMeta({
  title: "FootyGuess - Guess the Player from Their Transfer Trail",
  ogTitle: "FootyGuess - Guess the Player from Their Transfer Trail",
  description:
    "A football guessing game. Study the transfer timeline, unlock clues, and name the mystery player. Build streaks and compete on the leaderboard!",
  ogDescription:
    "A football guessing game. Study the transfer timeline, unlock clues, and name the mystery player.",
});

useHead({
  link: [{ rel: "canonical", href: "https://footyguess.yinside.de/" }],
});
</script>
