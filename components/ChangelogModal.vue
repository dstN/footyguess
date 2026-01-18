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

        <!-- v1.5.4 -->
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
            Scraper & UX Fixes
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 18</span
            >
          </h3>
          <div class="space-y-3 text-sm text-slate-300">
            <p>
              Resolved missing stats for players like Eriksen and polished
              mobile experience.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                <strong class="text-white">Scraper Fix:</strong> Added fallback
                for split-season stats.
              </li>
              <li>
                <strong class="text-white">Mobile UX:</strong> Fixed keyboard
                layout & scroll jumps.
              </li>
              <li>
                <strong class="text-white">Polish:</strong> Fixed syntax errors.
              </li>
            </ul>
          </div>
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
            Security & Mobile Polish
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 17</span
            >
          </h3>
          <div class="space-y-3 text-sm text-slate-300">
            <p>
              This patch combines critical security fixes with significant
              mobile improvements and a new in-app changelog viewer.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                <strong class="text-white">Security:</strong> Updated
                dependencies to resolve reported vulnerabilities.
              </li>
              <li>
                <strong class="text-white">Mobile Keyboard:</strong> Input now
                stays active while checking guesses, ensuring keyboard
                stability.
              </li>
              <li>
                <strong class="text-white">Mobile Layout:</strong> Switched to
                dynamic viewport height (dvh) to prevent scrolling jumps.
              </li>
              <li>
                <strong class="text-white">New Feature:</strong> Added this
                "What's New" modal!
              </li>
            </ul>
          </div>
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
            Major Update
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 17</span
            >
          </h3>
          <div class="space-y-3 text-sm text-slate-300">
            <p>
              A massive update focusing on reliability, admin tools, and visual
              polish.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                <strong class="text-white">Calmer Live Score:</strong> Score
                stays stable when not changing, only using decimals during
                countdowns.
              </li>
              <li>
                <strong class="text-white">Visual Stability:</strong> Fixed
                "shake" animation causing scrollbar glitches.
              </li>
              <li>
                <strong class="text-white">Session Integrity:</strong> Better
                handling of expired sessions with auto-recovery.
              </li>
              <li>
                <strong class="text-white">Admin Tools:</strong> New /reset page
                and atomic database resets.
              </li>
            </ul>
          </div>
        </section>

        <!-- v1.4.0 -->
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
            UI Polish
            <span class="ml-auto text-xs font-normal text-slate-500"
              >Jan 17</span
            >
          </h3>
          <ul class="list-inside list-disc space-y-2 text-sm text-slate-300">
            <li>
              <strong class="text-white">Mobile Header:</strong> Improved 2x2
              grid layout for Stats/Score badges.
            </li>
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
