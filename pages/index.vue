<template>
  <div class="content relative flex flex-1 flex-col justify-between">
    <h1 class="text-mint text-4xl font-bold text-shadow-md/30 dark:text-white">
      Footyguess
    </h1>
    <p class="dark:text-mint text-2xl font-medium text-black text-shadow-xs/30">
      Guess the football player<br />
      based on their transfer history
    </p>

    <NuxtLink
      to="/play"
      class="bg-mint hover:bg-mint mt-4 w-full rounded-xl py-3 text-lg font-bold text-black transition"
      >Play</NuxtLink
    >
  </div>
</template>
