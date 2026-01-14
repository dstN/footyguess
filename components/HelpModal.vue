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
              random clues (costs 6% each!)
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
            <!-- Scoring Formula -->
            <div class="rounded-lg border border-slate-700/50 bg-white/5 p-3">
              <h4
                class="mb-2 flex items-center gap-2 text-sm font-medium text-white"
              >
                <UIcon
                  name="i-lucide-calculator"
                  class="text-primary-400 h-4 w-4"
                />
                Score Calculation
              </h4>
              <p class="mb-2 text-xs text-slate-400">
                All bonuses/penalties are % of base × multiplier.
              </p>
              <div class="space-y-1 font-mono text-xs text-slate-300">
                <div class="flex items-center gap-2">
                  <span class="text-slate-500">1.</span>
                  <span>Base points × Difficulty multiplier</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-slate-500">2.</span>
                  <span class="text-mew-500">+ Streak bonus (+5% to +30%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-slate-500">3.</span>
                  <span class="text-emerald-400"
                    >+ No clues (+10%) / − Clues (−6% each, max −30%)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-slate-500">4.</span>
                  <span class="text-emerald-400"
                    >+ No wrong guesses (+10%) / − Wrong (−6% each, max
                    −30%)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-slate-500">5.</span>
                  <span class="text-emerald-400">± Time (+120% to −30%)</span>
                </div>
                <div
                  class="mt-2 flex items-center gap-2 border-t border-slate-700/50 pt-2"
                >
                  <span class="text-white">=</span>
                  <span class="font-semibold text-white"
                    >Final Score (min 10% of base)</span
                  >
                </div>
              </div>
            </div>

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
                Based on how famous the player is:
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
                Time Bonus / Penalty
              </h4>
              <div class="space-y-1 text-xs text-slate-300">
                <div class="flex justify-between">
                  <span>Instant (≤1s)</span>
                  <span class="text-emerald-400">+120% bonus</span>
                </div>
                <div class="flex justify-between">
                  <span>1s → 2min</span>
                  <span class="text-slate-400">Linear drop to 0%</span>
                </div>
                <div class="flex justify-between">
                  <span>2min → 5min</span>
                  <span class="text-slate-400">No bonus/penalty</span>
                </div>
                <div class="flex justify-between">
                  <span>5min → 10min</span>
                  <span class="text-red-400"
                    >Linear −0.1%/sec (up to −30%)</span
                  >
                </div>
              </div>
              <div class="mt-2 border-t border-slate-700/50 pt-2">
                <p class="text-xs text-amber-400">
                  <UIcon
                    name="i-lucide-clock"
                    class="mr-1 inline h-3 w-3"
                  />
                  Grace period: 5s per player transfer (max 30s) — timer starts
                  after grace.
                </p>
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
                Consecutive correct guesses add bonus:
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
                <span class="text-red-400">−6%</span>
                of your score. Maximum 5 clues = −30%.
              </p>
            </div>

            <!-- Wrong Guess Penalty -->
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
              <p class="mb-2 text-xs text-slate-400">
                Be careful! Wrong guesses have consequences:
              </p>
              <div class="space-y-2 text-xs text-slate-300">
                <div class="rounded bg-black/30 p-2">
                  <p class="mb-1 font-medium text-slate-200">
                    Maximum {{ MAX_WRONG_GUESSES }} wrong guesses allowed
                  </p>
                  <p class="text-slate-400">
                    <span class="text-red-400">−6% penalty</span>
                    per wrong guess (total
                    <span class="text-red-400">−30%</span>
                    at 5 wrong).
                  </p>
                </div>
                <div class="text-slate-400">
                  <p class="mb-1">Penalty breakdown:</p>
                  <div class="ml-2 space-y-0.5 text-slate-500">
                    <div>1st wrong guess: −6%</div>
                    <div>2nd wrong guess: −12%</div>
                    <div>3rd wrong guess: −18%</div>
                    <div>4th wrong guess: −24%</div>
                    <div>5th wrong guess: −30% (max penalty)</div>
                  </div>
                </div>
                <div
                  class="rounded border border-red-500/30 bg-red-500/10 p-2 text-red-300"
                >
                  <p class="mb-1 font-medium">
                    ⚠️ 6th wrong guess = Round lost!
                  </p>
                  <p class="text-red-400/80">
                    Round is immediately aborted with score 0.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
import { ref, inject, watch, onBeforeUnmount } from "vue";
import {
  createFocusTrap,
  restoreFocus,
  getFocusedElement,
} from "~/utils/accessibility";
import {
  DIFFICULTY_MULTIPLIERS,
  MAX_POINTS_BY_TIER,
  STREAK_BONUSES,
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

watch(isOpen, (open) => {
  if (open) {
    previousFocus = getFocusedElement();
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
