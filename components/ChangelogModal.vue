<template>
  <UModal
    v-model:open="isOpen"
    title="What's New"
    description="Recent updates and improvements to FootyGuess"
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
        <!-- v1.5.1 -->
        <section>
          <h3
            class="mb-2 flex items-center gap-2 text-lg font-semibold text-white"
          >
            <UBadge
              color="primary"
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
              color="primary"
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
              color="neutral"
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
              href="https://github.com/dstn/footyguess"
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
          color="neutral"
          variant="ghost"
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
