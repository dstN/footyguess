<template>
  <div
    class="relative min-h-screen overflow-visible bg-[#050915] text-slate-100"
    :class="{ 'animations-paused': isModalOpen }"
  >
    <a
      href="#main-content"
      @click.prevent="skipToMainContent"
      class="focus:ring-primary-500 sr-only fixed top-4 left-4 z-50 rounded bg-white px-4 py-2 font-bold text-black outline-hidden focus:not-sr-only focus:ring-4"
    >
      Skip to main content
    </a>
    <div class="pointer-events-none absolute inset-0">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(72,204,255,0.12),transparent_26%),radial-gradient(circle_at_80%_10%,rgba(255,75,165,0.16),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(0,255,178,0.14),transparent_32%)]"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,255,170,0.08),transparent_45%),linear-gradient(60deg,rgba(255,39,167,0.08),transparent_40%)]"
      />
      <div class="glitch-layer absolute inset-0" />
      <div class="cyber-grid absolute inset-0 opacity-70" />
    </div>

    <div
      id="main-content"
      class="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center p-6"
      tabindex="-1"
    >
      <slot @shake="triggerShake" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  triggerShakeKey,
  setModalOpenKey,
  isModalOpenKey,
} from "~/utils/injection-keys";
import { skipToMainContent } from "~/utils/accessibility";

const shouldShake = ref(false);
const isModalOpen = ref(false);

function triggerShake() {
  shouldShake.value = true;
}

function setModalOpen(open: boolean) {
  isModalOpen.value = open;
}

provide(triggerShakeKey, triggerShake);
provide(setModalOpenKey, setModalOpen);
provide(isModalOpenKey, isModalOpen);
</script>

<style scoped>
.cyber-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
}

.glitch-layer {
  inset: 0;
  overflow: hidden;
  background-image:
    linear-gradient(rgba(20, 255, 180, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 180, 255, 0.18) 1px, transparent 1px);
  background-size: 80px 80px;
  mix-blend-mode: screen;
  opacity: 0.6;
}

.glitch-layer::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle at 10% 80%,
      rgba(0, 255, 170, 0.18),
      transparent 30%
    ),
    radial-gradient(
      circle at 90% 30%,
      rgba(255, 90, 200, 0.15),
      transparent 32%
    ),
    linear-gradient(180deg, rgba(0, 255, 170, 0.08), rgba(0, 0, 0, 0));
  mix-blend-mode: screen;
  filter: blur(1.5px);
}

.animations-paused .glitch-layer,
.animations-paused .glitch-layer::after {
  animation-play-state: paused;
}

@keyframes glitch-shift {
  0% {
    background-position:
      0 0,
      0 0;
    opacity: 0.55;
  }
  50% {
    background-position:
      -60px 40px,
      40px -60px;
    opacity: 0.75;
  }
  100% {
    background-position:
      -120px 80px,
      80px -120px;
    opacity: 0.6;
  }
}

@keyframes glitch-drift {
  0% {
    background-position: 0 0;
    opacity: 0.6;
  }
  100% {
    background-position: -18px 14px;
    opacity: 0.85;
  }
}

@media (min-width: 768px) {
  .glitch-layer {
    animation: glitch-shift 9s linear infinite;
    will-change: background-position, opacity;
  }
  .glitch-layer::after {
    animation: glitch-drift 14s ease-in-out infinite alternate;
  }
}
</style>
