<template>
  <div
    class="min-h-screen bg-size-[100vw_100vh] bg-top-left flex items-center justify-center"
    id="aurora"
  >
    <LandingHero />
  </div>
</template>

<script setup>
import LandingHero from "~/components/LandingHero.vue";
</script>

<style scoped>
html.dark #aurora {
  background-image: url("/img/aurora.webp");
}
html:not(.dark) #aurora {
  background-image: url("/img/aurora_light.webp");
}
</style>
