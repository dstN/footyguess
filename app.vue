<template>
  <UContainer class="min-h-screen h-screen flex">
    <div class="flex items-center space-x-4">
      <USkeleton
        class="h-12 w-12"
        :ui="{ rounded: 'rounded-full' }"
      />
      <div class="space-y-2">
        <USkeleton class="h-4 w-[250px]" />
        <USkeleton class="h-4 w-[200px]" />
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const apiUrl = "https://transfermarkt-api.fly.dev";
const min = 1992;
const max = new Date().getFullYear();
function randomSeason(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function getClubs() {
  const season = randomSeason(min, max);
  return await $fetch(`${apiUrl}/competitions/CL/clubs?season_id=${season}`);
}
console.log(await getClubs());
</script>
