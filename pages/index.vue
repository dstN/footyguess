<template>
  <main class="flex flex-1 flex-col gap-6">
    <UCard class="relative overflow-hidden border border-primary-900/50 bg-slate-950/60">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_32%)]" />
      <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-2">
          <UBadge color="primary" variant="soft" class="uppercase tracking-[0.22em]">
            Footyguess
          </UBadge>
          <h1 class="text-3xl font-bold text-white sm:text-4xl">
            Guess the player from their transfer trail.
          </h1>
          <p class="max-w-xl text-slate-300">
            A cyberpunk football riddle. Inspect the club timeline, unlock random neon clues, and see if you can name the mystery baller.
          </p>
        </div>

        <div class="flex flex-col items-start gap-3 sm:items-end">
          <UButton
            to="/play"
            color="primary"
            size="lg"
            icon="i-lucide-play"
            class="shadow-[0_0_20px_rgba(14,249,174,0.35)]"
          >
            Play now
          </UButton>
          <p class="text-xs uppercase tracking-[0.16em] text-primary-100/80">
            Mobile-first · Nuxt UI
          </p>
        </div>
      </div>
    </UCard>
  </main>
</template>
