<template>
  <main class="flex flex-1 items-center justify-center">
    <UCard class="w-full max-w-xl border border-primary-900/50 bg-slate-950/70 text-center">
      <div class="flex flex-col items-center gap-3">
        <UIcon
          name="i-lucide-party-popper"
          class="text-4xl text-primary-200"
        />
        <h1 class="text-3xl font-bold text-white">
          You cracked the code!
        </h1>
        <p class="text-slate-300">
          The mystery player is yours. Spin up another cyber round and keep the streak alive.
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton to="/play" color="primary" icon="i-lucide-shuffle">
            New mystery
          </UButton>
          <UButton to="/" variant="ghost" color="neutral">
            Back home
          </UButton>
        </div>
      </div>
    </UCard>
  </main>
</template>
