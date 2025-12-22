<template>
  <UApp :toaster="toaster">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UModals />
  </UApp>
</template>

<script setup>
const toaster = { position: "top-right", expand: false };
</script>
