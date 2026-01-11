<template>
  <UModal
    v-model:open="isOpen"
    title="How to Play"
    description="Learn how to play Footyguess"
  >
    <UButton
      icon="i-lucide-help-circle"
      :color="buttonColor"
      :variant="buttonVariant"
      :size="buttonSize"
      :class="`cursor-pointer ${buttonClass}`"
      :aria-label="buttonLabel"
      @click="openModal"
    >
      <span
        v-if="showLabel"
        class="hidden md:inline"
        >{{ buttonLabel }}</span
      >
    </UButton>

    <template #body>
      <div class="space-y-6 text-slate-200">
        <!-- Game Overview -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UIcon
              name="i-lucide-target"
              class="text-primary-400 h-5 w-5"
            />
            The Goal
          </h3>
          <p class="text-sm leading-relaxed text-slate-300">
            Guess the mystery football player by examining their transfer
            history. You'll see a timeline of club moves with dates, but the
            player's name is hidden.
          </p>
        </section>

        <!-- How to Play -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UIcon
              name="i-lucide-gamepad-2"
              class="text-primary-400 h-5 w-5"
            />
            How to Play
          </h3>
          <ol class="list-inside list-decimal space-y-2 text-sm text-slate-300">
            <li>
              Study the <strong class="text-white">transfer timeline</strong> —
              clubs and dates are shown
            </li>
            <li>
              Use <strong class="text-white">"Get a tip"</strong> to reveal
              random clues (costs points!)
            </li>
            <li>Type your guess in the search box and select the player</li>
            <li>
              Hit <strong class="text-white">Submit</strong> — correct guesses
              build your streak!
            </li>
          </ol>
        </section>

        <!-- Scoring -->
        <section>
          <h3
            class="mb-3 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UIcon
              name="i-lucide-trophy"
              class="text-primary-400 h-5 w-5"
            />
            Scoring System
          </h3>

          <div class="space-y-4">
            <!-- Difficulty -->
            <div class="rounded-lg border border-slate-700/50 bg-white/5 p-3">
              <h4
                class="mb-2 flex items-center gap-2 text-sm font-medium text-white"
              >
                <UIcon
                  name="i-lucide-gauge"
                  class="h-4 w-4 text-yellow-400"
                />
                Difficulty Multiplier
              </h4>
              <p class="mb-2 text-xs text-slate-400">
                Based on how famous the player is (international/league
                appearances):
              </p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex items-center gap-2">
                  <UBadge
                    color="success"
                    variant="soft"
                    size="xs"
                    >Easy</UBadge
                  >
                  <span class="text-slate-300"
                    >{{ DIFFICULTY_MULTIPLIERS.easy }}× ({{
                      MAX_POINTS_BY_TIER.easy
                    }}
                    pts max)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    color="warning"
                    variant="soft"
                    size="xs"
                    >Medium</UBadge
                  >
                  <span class="text-slate-300"
                    >{{ DIFFICULTY_MULTIPLIERS.medium }}× ({{
                      MAX_POINTS_BY_TIER.medium
                    }}
                    pts)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    color="warning"
                    variant="soft"
                    size="xs"
                    class="bg-orange-500/10 text-orange-100"
                    >Hard</UBadge
                  >
                  <span class="text-slate-300"
                    >{{ DIFFICULTY_MULTIPLIERS.hard }}× ({{
                      MAX_POINTS_BY_TIER.hard
                    }}
                    pts)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    color="error"
                    variant="soft"
                    size="xs"
                    >Ultra</UBadge
                  >
                  <span class="text-slate-300"
                    >{{ DIFFICULTY_MULTIPLIERS.ultra }}× ({{
                      MAX_POINTS_BY_TIER.ultra
                    }}
                    pts)</span
                  >
                </div>
              </div>
            </div>

            <!-- Time Bonus -->
            <div class="rounded-lg border border-slate-700/50 bg-white/5 p-3">
              <h4
                class="mb-2 flex items-center gap-2 text-sm font-medium text-white"
              >
                <UIcon
                  name="i-lucide-timer"
                  class="h-4 w-4 text-blue-400"
                />
                Time Bonus
              </h4>
              <p class="mb-2 text-xs text-slate-400">
                Guess faster for bonus points:
              </p>
              <div class="space-y-1 text-xs text-slate-300">
                <div class="flex justify-between">
                  <span>Instant (≤{{ TIME_BONUS.instantThreshold }}s)</span>
                  <span class="text-emerald-400"
                    >+{{ Math.round(TIME_BONUS.maxBonus * 100) }}% bonus</span
                  >
                </div>
                <div class="flex justify-between">
                  <span
                    >{{ TIME_BONUS.instantThreshold }}s →
                    {{ Math.floor(TIME_BONUS.zeroBonusTime / 60) }}min</span
                  >
                  <span class="text-slate-400">Linear drop to 0%</span>
                </div>
                <div class="flex justify-between">
                  <span
                    >{{ Math.floor(TIME_BONUS.zeroBonusTime / 60) }}min →
                    {{ Math.floor(TIME_BONUS.penaltyStartTime / 60) }}min</span
                  >
                  <span class="text-slate-400">No bonus/penalty</span>
                </div>
                <div class="flex justify-between">
                  <span
                    >After
                    {{ Math.floor(TIME_BONUS.penaltyStartTime / 60) }}min</span
                  >
                  <span class="text-red-400"
                    >-{{ Math.round(TIME_BONUS.penaltyPerStep * 100) }}% per 30s
                    (max -{{ Math.round(TIME_BONUS.maxPenalty * 100) }}%)</span
                  >
                </div>
              </div>
            </div>

            <!-- Streak Bonus -->
            <div class="rounded-lg border border-slate-700/50 bg-white/5 p-3">
              <h4
                class="mb-2 flex items-center gap-2 text-sm font-medium text-white"
              >
                <UIcon
                  name="i-lucide-flame"
                  class="h-4 w-4 text-orange-400"
                />
                Streak Bonus
              </h4>
              <p class="mb-2 text-xs text-slate-400">
                Consecutive correct guesses multiply your score:
              </p>
              <div class="grid grid-cols-3 gap-2 text-xs text-slate-300">
                <div
                  v-for="bonus in STREAK_BONUSES"
                  :key="bonus.threshold"
                >
                  {{ bonus.threshold }}+ streak:
                  <span class="text-mew-500"
                    >+{{ Math.round(bonus.bonus * 100) }}%</span
                  >
                </div>
              </div>
            </div>

            <!-- Clue Penalty -->
            <div class="rounded-lg border border-slate-700/50 bg-white/5 p-3">
              <h4
                class="mb-2 flex items-center gap-2 text-sm font-medium text-white"
              >
                <UIcon
                  name="i-lucide-lightbulb"
                  class="h-4 w-4 text-purple-400"
                />
                Clue Penalty
              </h4>
              <p class="text-xs text-slate-300">
                Each clue revealed costs
                <span class="text-red-400">-{{ CLUE_PENALTY }} points</span>
                from your base score. Use clues wisely!
              </p>
            </div>

            <!-- Malice Penalty / Wrong Guesses -->
            <div class="rounded-lg border border-red-700/50 bg-red-900/10 p-3">
              <h4
                class="mb-2 flex items-center gap-2 text-sm font-medium text-white"
              >
                <UIcon
                  name="i-lucide-zap"
                  class="h-4 w-4 text-red-400"
                />
                Wrong Guess Penalty
              </h4>
              <p class="mb-3 text-xs text-slate-400">
                Be careful! Wrong guesses have serious consequences:
              </p>
              <div class="space-y-2 text-xs text-slate-300">
                <div class="rounded bg-black/30 p-2">
                  <p class="mb-1 font-medium text-slate-200">
                    Maximum {{ MAX_WRONG_GUESSES }} wrong guesses allowed
                  </p>
                  <p class="text-slate-400">
                    <span class="text-red-400"
                      >-{{ Math.round(MALICE_PENALTY.perGuess * 100) }}%
                      penalty</span
                    >
                    per wrong guess (total
                    <span class="text-red-400"
                      >-{{ Math.round(MALICE_PENALTY.max * 100) }}%</span
                    >
                    at {{ MAX_WRONG_GUESSES }} wrong).
                  </p>
                </div>
                <div class="text-slate-400">
                  <p class="mb-1">Penalty breakdown:</p>
                  <div class="ml-2 space-y-0.5 text-slate-500">
                    <div>1st wrong guess: -10%</div>
                    <div>2nd wrong guess: -20%</div>
                    <div>3rd wrong guess: -30%</div>
                    <div>4th wrong guess: -40%</div>
                    <div>5th wrong guess: -50% (max penalty)</div>
                  </div>
                </div>
                <div
                  class="rounded border border-red-500/30 bg-red-500/10 p-2 text-red-300"
                >
                  <p class="mb-1 font-medium">⚠️ 6th wrong guess = Round lost!</p>
                  <p class="text-red-400/80">
                    If you make a 6th wrong guess, the round is immediately
                    aborted with a score of 0.
                  </p>
                </div>
                <div class="border-t border-slate-700/50 pt-2 text-slate-400">
                  <p class="mb-1">Important notes:</p>
                  <ul class="ml-2 list-disc space-y-0.5">
                    <li>Your streak resets to 0 on any wrong guess</li>
                    <li>
                      You can still win with reduced score after 1-5 wrong
                      guesses
                    </li>
                    <li>Give up any time if you're unsure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Tips -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UIcon
              name="i-lucide-lightbulb"
              class="text-primary-400 h-5 w-5"
            />
            Pro Tips
          </h3>
          <ul class="list-inside list-disc space-y-1 text-sm text-slate-300">
            <li>
              Look for distinctive transfer patterns (loan spells, big moves)
            </li>
            <li>Career length and clubs can narrow down the era</li>
            <li>Youth academy → first team moves are good hints</li>
            <li>Build streaks for massive score bonuses!</li>
          </ul>
        </section>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton
          color="primary"
          class="cursor-pointer"
          @click="close"
        >
          Got it!
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, inject, watch, onMounted, onBeforeUnmount } from "vue";
import {
  createFocusTrap,
  restoreFocus,
  getFocusedElement,
} from "~/utils/accessibility";
import {
  DIFFICULTY_MULTIPLIERS,
  MAX_POINTS_BY_TIER,
  STREAK_BONUSES,
  TIME_BONUS,
  CLUE_PENALTY,
  MALICE_PENALTY,
  MAX_WRONG_GUESSES,
} from "~/utils/scoring-constants";

const props = withDefaults(
  defineProps<{
    buttonLabel?: string;
    buttonColor?: "primary" | "neutral" | "error" | "success" | "warning";
    buttonVariant?: "solid" | "outline" | "soft" | "subtle" | "ghost" | "link";
    buttonSize?: "xs" | "sm" | "md" | "lg" | "xl";
    buttonClass?: string;
    showLabel?: boolean;
    iconSize?: string;
  }>(),
  {
    buttonLabel: "How to Play",
    buttonColor: "neutral",
    buttonVariant: "ghost",
    buttonSize: "sm",
    buttonClass: "",
    showLabel: true,
    iconSize: "h-3.5 w-3.5",
  },
);

const setModalOpen = inject<(open: boolean) => void>("setModalOpen");

const isOpen = ref(false);

watch(isOpen, (open) => {
  setModalOpen?.(open);
});

function openModal() {
  isOpen.value = true;
}

// Accessibility: Focus management
let removeTrap: (() => void) | null = null;
let previousFocus: HTMLElement | null = null;
const modalRef = ref<HTMLElement | null>(null); // Note: UModal doesn't easily expose ref to inner content via prop, so we might need to rely on UModal's built-in focus management or use a different approach.
// Ideally, UModal handles this. But to demonstrate integration:

watch(isOpen, (open) => {
  if (open) {
    previousFocus = getFocusedElement();
    // Tiny delay to allow modal to render
    setTimeout(() => {
      const modalEl = document.querySelector('[role="dialog"]');
      if (modalEl instanceof HTMLElement) {
        removeTrap = createFocusTrap(modalEl);
      }
    }, 100);
  } else {
    removeTrap?.();
    restoreFocus(previousFocus);
  }
});

onBeforeUnmount(() => {
  removeTrap?.();
});
</script>
