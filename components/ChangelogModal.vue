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
                Visit
                <code class="text-primary-400">/delete</code> to remove your
                session.
              </li>
              <li>
                Deleting removes scores, rounds, leaderboard entries and session
                data.
              </li>
              <li>Your current session ID is filled in for you.</li>
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
            <p>Stricter difficulty tiers, with two exceptions.</p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                Easy players now need both international and top-5 league
                appearances.
              </li>
              <li>25+ CL goals or 20+ G+A also count as Easy.</li>
              <li>
                So do goalkeepers with 325+ clean sheets and international caps.
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
              Fixes to player data and search, plus a fairer difficulty mix.
            </p>
            <ul class="list-inside list-disc space-y-1 pl-2">
              <li>
                Default difficulty now picks Easy, Medium and Hard players 33%
                of the time each (it used to be 73% Hard).
              </li>
              <li>
                Search shows full names when several players share one, like
                "Fernando".
              </li>
              <li>
                Fixed "unknown" positions and accents in search names (like
                "Touré").
              </li>
              <li>Added ~180 top scorers and Ballon d'Or winners.</li>
              <li>Tap the live score badge to hide it.</li>
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
              The input stays visible above the virtual keyboard on mobile.
            </li>
            <li>The page no longer jumps when you focus the guess input.</li>
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
            <li>The input stays active while a guess is checked.</li>
            <li>
              Dynamic viewport units stop the layout from jumping while
              scrolling.
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
            <li>The live score only shows decimals while it counts down.</li>
            <li>Expired sessions recover automatically.</li>
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
            <li>The grace period is now 2.5s per club (max 15s).</li>
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
