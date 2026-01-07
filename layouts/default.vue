<template>
  <div
    class="relative min-h-screen overflow-visible bg-[#050915] text-slate-100"
    :class="{ 'animations-paused': isModalOpen }"
  >
    <div class="pointer-events-none absolute inset-0">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(72,204,255,0.12),transparent_26%),radial-gradient(circle_at_80%_10%,rgba(255,75,165,0.16),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(0,255,178,0.14),transparent_32%)]"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,255,170,0.08),transparent_45%),linear-gradient(60deg,rgba(255,39,167,0.08),transparent_40%)]"
      />
      <div class="glitch-layer absolute inset-0" />
    </div>

    <div
      class="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 pt-8 pb-28 md:px-0"
    >
      <div
        class="glass-panel border-primary-900/50 relative w-full overflow-hidden rounded-3xl border bg-white/5 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xs"
        :class="{ 'animate-shake': shouldShake }"
        @animationend="shouldShake = false"
      >
        <div class="pointer-events-none absolute inset-0 opacity-70">
          <div class="cyber-grid absolute inset-0" />
          <div
            class="from-primary-500 absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-pink-400 to-emerald-300"
          />
        </div>

        <div class="relative z-10 p-6 sm:p-8">
          <slot @shake="triggerShake" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  triggerShakeKey,
  setModalOpenKey,
  isModalOpenKey,
} from "~/utils/injection-keys";

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
  animation: glitch-shift 9s linear infinite;
  will-change: background-position, opacity;
  filter: drop-shadow(0 0 6px rgba(0, 255, 200, 0.25));
}

@keyframes animate {
  0% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(-6px, 4px, 0);
  }

  100% {
    transform: translate3d(0, 0, 0);
  }
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
  animation: glitch-drift 14s ease-in-out infinite alternate;
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

.animate-shake {
  animation: animate 0.4s ease-in-out;
}

.animations-paused .glitch-layer,
.animations-paused .glitch-layer::after {
  animation-play-state: paused;
}
</style>
