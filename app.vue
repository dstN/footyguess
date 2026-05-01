<template>
  <div v-if="isMaintenance">
    <MaintenanceMode />
  </div>
  <UApp
    :toaster="toaster"
    v-else
  >
    <AppInterference />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UModals />
  </UApp>
</template>

<script setup lang="ts">
import type { ToasterProps } from "@nuxt/ui";

const isMaintenance = ref(false);
const toaster: ToasterProps = { position: "top-right", expand: false };
</script>
