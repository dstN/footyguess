<template>
  <ErrorBoundary>
    <main class="flex flex-1 flex-col gap-6">
      <UCard
        class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_32%)]"
        />
        <div
          class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="space-y-2">
            <UBadge
              color="primary"
              variant="soft"
              class="tracking-[0.22em] uppercase"
            >
              Footyguess
            </UBadge>
            <h1 class="text-3xl font-bold text-white sm:text-4xl">
              Guess the player from their transfer trail.
            </h1>
            <p class="max-w-xl text-slate-300">
              A football riddle. Inspect the club timeline, unlock random clues,
              and see if you can name the mystery baller.
            </p>
          </div>

          <div class="flex flex-col items-start gap-3 sm:items-end">
            <UButton
              to="/play"
              color="primary"
              size="xl"
              icon="i-lucide-play"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-[0_0_24px_rgba(14,249,174,0.4)] sm:h-20 sm:w-20 sm:flex-col sm:rounded-2xl sm:text-sm"
            >
              <span class="sm:hidden">Play now</span>
              <span class="hidden sm:block">Play</span>
            </UButton>
          </div>
        </div>
      </UCard>
    </main>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import ErrorBoundary from "~/components/ErrorBoundary.vue";
</script>
