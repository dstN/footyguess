<template>
  <UModal
    v-model:open="isOpen"
    title="What's New"
    description="Recent updates and improvements"
  >
    <UButton
      icon="i-lucide-scroll-text"
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
        <!-- v1.6.3 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.6.3</UBadge
            >
            Delete Session
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 19</span
            >
          </h3>
          <div class="space-y-3 text-sm text-slate-300">
            <p>
              New self-service page to delete your session and all game data.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                <strong class="text-white">Delete Page:</strong> Visit
                <code class="text-primary-400">/delete</code> to remove your
                session.
              </li>
              <li>
                <strong class="text-white">Full Cleanup:</strong> Removes
                scores, rounds, leaderboard entries, and session data.
              </li>
              <li>
                <strong class="text-white">Auto-Detection:</strong> Pre-fills
                your current session ID for convenience.
              </li>
            </ul>
          </div>
        </section>

        <!-- v1.6.1 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.6.1</UBadge
            >
            Difficulty Refinements
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 18</span
            >
          </h3>
          <div class="space-y-3 text-sm text-slate-300">
            <p>
              Overhauled difficulty tiers with strict criteria and exceptions.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                <strong class="text-white">Stricter Thresholds:</strong> Require
                BOTH international AND top-5 league appearances.
              </li>
              <li>
                <strong class="text-white">CL Excellence:</strong> 25+ CL goals
                or 20+ G+A qualify as Easy.
              </li>
              <li>
                <strong class="text-white">GK Recognition:</strong> 325+ clean
                sheets with international experience → Easy.
              </li>
            </ul>
          </div>
        </section>

        <!-- v1.6.0 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.6.0</UBadge
            >
            Gameplay & Integrity
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 18</span
            >
          </h3>
          <div class="space-y-3 text-sm text-slate-300">
            <p>
              A major update to data integrity, search, and gameplay balance.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                <strong class="text-white">Better Default Difficulty:</strong>
                Now ensures an equal 33% chance for Easy, Medium, and Hard
                players (was skewed to 73% Hard).
              </li>
              <li>
                <strong class="text-white">Smart Search:</strong> Duplicate
                names like "Fernando" now show full names for clarity.
              </li>
              <li>
                <strong class="text-white">Data Repair:</strong> Fixed "unknown"
                positions and normalized search names (fixes accents like
                "Touré").
              </li>
              <li>
                <strong class="text-white">New Players:</strong> Added ~180 new
                Top Scorers & Ballon d'Or winners.
              </li>
              <li>
                <strong class="text-white">Score Hiding:</strong> Tap the live
                score badge to hide it if you prefer avoiding spoilers/stress.
              </li>
            </ul>
          </div>
        </section>

        <!-- v1.5.2 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.5.2</UBadge
            >
            Mobile UX
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 18</span
            >
          </h3>
          <ul
            class="list-inside list-disc space-y-1 pl-2 text-sm text-slate-300"
          >
            <li>
              <strong class="text-white">Fixed Keyboard:</strong> Input stays
              visible above the virtual keyboard on mobile.
            </li>
            <li>
              <strong class="text-white">No Scroll Jumps:</strong> Fixed page
              jumping when focusing the guess input.
            </li>
          </ul>
        </section>

        <!-- v1.5.1 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.5.1</UBadge
            >
            Mobile Polish
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 17</span
            >
          </h3>
          <ul
            class="list-inside list-disc space-y-1 pl-2 text-sm text-slate-300"
          >
            <li>
              <strong class="text-white">Mobile Keyboard:</strong> Input stays
              active while checking guesses.
            </li>
            <li>
              <strong class="text-white">Mobile Layout:</strong> Switched to
              dynamic viewport to prevent scrolling jumps.
            </li>
          </ul>
        </section>

        <!-- v1.5.0 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.5.0</UBadge
            >
            Gameplay & Score Polish
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 17</span
            >
          </h3>
          <ul
            class="list-inside list-disc space-y-1 pl-2 text-sm text-slate-300"
          >
            <li>
              <strong class="text-white">Calmer Live Score:</strong> Score stays
              stable when not changing, only uses decimals during countdowns.
            </li>
            <li>
              <strong class="text-white">Session Integrity:</strong> Better
              handling of expired sessions with auto-recovery.
            </li>
          </ul>
        </section>

        <!-- v1.4.4 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="secondary"
              variant="subtle"
              size="xs"
              >v1.4.4</UBadge
            >
            Grace Timer
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 17</span
            >
          </h3>
          <ul
            class="list-inside list-disc space-y-1 pl-2 text-sm text-slate-300"
          >
            <li>
              <strong class="text-white">Grace Period:</strong> Adjusted to 2.5s
              per club (max 15s) for better pacing.
            </li>
          </ul>
        </section>

        <section class="border-t border-slate-800 pt-4">
          <p class="text-center text-xs text-slate-500">
            View full history on
            <a
              href="https://github.com/dstn/footyguess/blob/master/CHANGELOG.md"
              target="_blank"
              class="text-primary-400 hover:underline"
              >GitHub</a
            >
          </p>
        </section>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton
          color="secondary"
          variant="solid"
          class="cursor-pointer"
          @click="close"
        >
          Close
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

const props = withDefaults(
  defineProps<{
    buttonLabel?: string;
    buttonColor?:
      | "primary"
      | "secondary"
      | "neutral"
      | "error"
      | "success"
      | "warning";
    buttonVariant?: "solid" | "outline" | "soft" | "subtle" | "ghost" | "link";
    buttonSize?: "xs" | "sm" | "md" | "lg" | "xl";
    buttonClass?: string;
    showLabel?: boolean;
    iconSize?: string;
  }>(),
  {
    buttonLabel: "Updates",
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
