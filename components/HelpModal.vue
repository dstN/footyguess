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
      @click="openModal"
    >
      <span v-if="showLabel">{{ buttonLabel }}</span>
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
                  <span class="text-slate-300">1.0× (100 pts max)</span>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    color="warning"
                    variant="soft"
                    size="xs"
                    >Medium</UBadge
                  >
                  <span class="text-slate-300">1.25× (125 pts)</span>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    color="warning"
                    variant="soft"
                    size="xs"
                    class="bg-orange-500/10 text-orange-100"
                    >Hard</UBadge
                  >
                  <span class="text-slate-300">1.5× (150 pts)</span>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    color="error"
                    variant="soft"
                    size="xs"
                    >Ultra</UBadge
                  >
                  <span class="text-slate-300">2.0× (200 pts)</span>
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
                  <span>After 5min</span>
                  <span class="text-red-400">-10% per 30s (max -50%)</span>
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
                <div>5+ streak: <span class="text-mew-500">+5%</span></div>
                <div>15+ streak: <span class="text-mew-500">+10%</span></div>
                <div>30+ streak: <span class="text-mew-500">+15%</span></div>
                <div>60+ streak: <span class="text-mew-500">+20%</span></div>
                <div>100+ streak: <span class="text-mew-500">+30%</span></div>
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
                <span class="text-red-400">-10 points</span> from your base
                score. Use clues wisely!
              </p>
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
import { ref, inject, watch } from "vue";

const props = withDefaults(
  defineProps<{
    buttonLabel?: string;
    buttonColor?: "primary" | "neutral" | "error" | "success" | "warning";
    buttonVariant?: "solid" | "outline" | "soft" | "subtle" | "ghost" | "link";
    buttonSize?: "xs" | "sm" | "md" | "lg" | "xl";
    buttonClass?: string;
    showLabel?: boolean;
  }>(),
  {
    buttonLabel: "How to Play",
    buttonColor: "neutral",
    buttonVariant: "ghost",
    buttonSize: "sm",
    buttonClass: "",
    showLabel: true,
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
</script>
