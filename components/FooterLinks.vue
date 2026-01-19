<template>
  <footer
    class="flex items-center justify-center gap-4 py-4 text-xs text-slate-500"
  >
    <NuxtLink
      to="/legal"
      class="hover:text-primary-400 transition-colors"
    >
      LEGAL
    </NuxtLink>
    <span class="text-slate-700">·</span>
    <a
      href="https://github.com/dstn/footyguess/blob/master/CHANGELOG.md"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-primary-400 text-slate-600 transition-colors"
    >
      v{{ version }}
    </a>
    <span class="text-slate-700">·</span>
    <NuxtLink
      to="/delete"
      class="hover:text-primary-400 transition-colors"
    >
      MY DATA
    </NuxtLink>
  </footer>
</template>

<script setup lang="ts">
// Import version from package.json at build time
const version = __APP_VERSION__;
</script>
