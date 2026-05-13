<template>
  <div
    class="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#050915] text-slate-100"
  >
    <!-- Background Effects -->
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

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md p-6 text-center">
      <div
        class="glass-panel border-primary-900/50 relative w-full overflow-hidden rounded-3xl border bg-white/5 p-8 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xs"
      >
        <div class="pointer-events-none absolute inset-0 opacity-70">
          <div class="cyber-grid absolute inset-0" />
          <div
            class="from-primary-500 via-mew-500 to-primary-300 absolute inset-x-0 top-0 h-1 bg-gradient-to-r"
          />
        </div>

        <div class="relative z-10 space-y-6">
          <UIcon
            name="i-heroicons-wrench-screwdriver"
            class="text-primary-500 mx-auto h-24 w-24 animate-pulse"
          />
          <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
            Under Construction
          </h1>
          <p class="text-lg text-gray-400">
            We are currently offline for maintenance. Please check back later.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Block scroll when mounted
onMounted(() => {
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.body.style.overflow = "";
});
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
</style>
