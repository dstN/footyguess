<template>
  <div
    v-if="hasError"
    class="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4"
  >
    <div class="max-w-md space-y-4 text-center">
      <div class="text-6xl">⚠️</div>
      <h1 class="text-3xl font-bold text-red-500">Something went wrong</h1>
      <p class="text-lg text-slate-300">{{ errorMessage }}</p>

      <div class="flex justify-center gap-2 pt-4">
        <button
          @click="reset"
          class="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
        <button
          @click="goHome"
          class="rounded bg-slate-600 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
        >
          Go home
        </button>
      </div>

      <details
        v-if="isDev"
        class="mt-6 text-left"
      >
        <summary
          class="cursor-pointer text-sm text-slate-400 hover:text-slate-300"
        >
          Error details (dev only)
        </summary>
        <pre
          class="mt-2 overflow-auto rounded border border-slate-800 bg-slate-900 p-3 text-xs text-red-400"
          >{{ stack }}</pre
        >
      </details>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";
import { useRouter } from "vue-router";

const hasError = ref(false);
const errorMessage = ref("An unexpected error occurred");
const stack = ref("");
const router = useRouter();
const isDev = import.meta.dev;

const reset = () => {
  hasError.value = false;
  errorMessage.value = "";
  stack.value = "";
};

const goHome = () => {
  reset();
  router.push("/").catch(() => {
    // If navigation fails, reload page
    window.location.href = "/";
  });
};

onErrorCaptured((err: unknown) => {
  hasError.value = true;

  // Extract message safely
  if (err instanceof Error) {
    errorMessage.value = err.message || "An unexpected error occurred";
    stack.value = err.stack || "";
  } else if (typeof err === "string") {
    errorMessage.value = err;
  } else {
    errorMessage.value = String(err);
  }

  // Log to console and error tracking (if available)
  console.error("[ErrorBoundary]", err);

  // Prevent error from propagating further
  return false;
});
</script>
