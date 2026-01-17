<template>
  <div class="w-full space-y-8">
    <div class="text-center">
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/50"
      >
        <UIcon
          name="i-lucide-database-zap"
          class="h-8 w-8 text-red-400"
        />
      </div>
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-white">
        Reset Database
      </h1>
      <p class="text-primary-200/60 mt-2">
        Destructive action. Please proceed with caution.
      </p>
    </div>

    <div class="space-y-6">
      <div
        v-if="!result"
        class="rounded-xl border border-red-500/10 bg-red-500/5 p-4 backdrop-blur-sm"
      >
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-alert-triangle"
            class="mt-0.5 h-5 w-5 shrink-0 text-red-400"
          />
          <div class="space-y-1 text-sm">
            <p class="font-medium text-red-200">What will be deleted?</p>
            <ul class="list-disc pl-4 text-red-200/60">
              <li>All active user sessions</li>
              <li>All leaderboard entries</li>
              <li>All stored rounds and scores</li>
            </ul>
          </div>
        </div>
      </div>

      <form
        @submit.prevent="handleReset"
        class="space-y-6"
      >
        <UFormField
          label="Admin Secret"
          :required="!isDev"
          :help="isDev ? 'Development Mode Bypass Active' : undefined"
        >
          <UInput
            v-model="secret"
            type="password"
            :placeholder="isDev ? 'Optional' : 'Enter SCORING_SECRET'"
            class="w-full"
            :disabled="isLoading"
            size="lg"
            :color="isDev ? 'primary' : 'neutral'"
            icon="i-lucide-lock"
          />
        </UFormField>

        <div class="grid gap-3">
          <UButton
            block
            size="xl"
            color="error"
            :loading="isLoading"
            :disabled="(!isDev && !secret) || isLoading"
            icon="i-lucide-trash-2"
            @click="handleReset"
          >
            Reset Everything
          </UButton>

          <UButton
            block
            variant="ghost"
            to="/"
            color="neutral"
            size="md"
          >
            Cancel and Return Home
          </UButton>
        </div>
      </form>

      <div
        v-if="result"
        class="animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div
          class="rounded-xl border p-6 text-center shadow-2xl backdrop-blur-md"
          :class="
            result.success
              ? 'border-primary-500/30 bg-primary-500/10'
              : 'border-red-500/30 bg-red-500/10'
          "
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            :class="
              result.success
                ? 'bg-primary-500/20 text-primary-400'
                : 'bg-red-500/20 text-red-400'
            "
          >
            <UIcon
              :name="result.success ? 'i-lucide-check' : 'i-lucide-x'"
              class="h-6 w-6"
            />
          </div>
          <h3
            class="text-lg font-bold"
            :class="result.success ? 'text-primary-200' : 'text-red-200'"
          >
            {{ result.success ? "Reset Complete" : "Reset Failed" }}
          </h3>
          <p class="mt-1 text-sm text-white/50">{{ result.message }}</p>

          <div
            v-if="result.deleted"
            class="mt-6 grid grid-cols-2 gap-3 text-xs"
          >
            <div class="rounded-lg bg-black/20 p-2">
              <span
                class="block text-[10px] tracking-wider text-white/30 uppercase"
                >Scores</span
              >
              <span class="font-mono text-xl text-white">{{
                result.deleted.scores
              }}</span>
            </div>
            <div class="rounded-lg bg-black/20 p-2">
              <span
                class="block text-[10px] tracking-wider text-white/30 uppercase"
                >Rounds</span
              >
              <span class="font-mono text-xl text-white">{{
                result.deleted.rounds
              }}</span>
            </div>
            <div class="rounded-lg bg-black/20 p-2">
              <span
                class="block text-[10px] tracking-wider text-white/30 uppercase"
                >Entries</span
              >
              <span class="font-mono text-xl text-white">{{
                result.deleted.leaderboard
              }}</span>
            </div>
            <div class="rounded-lg bg-black/20 p-2">
              <span
                class="block text-[10px] tracking-wider text-white/30 uppercase"
                >Sessions</span
              >
              <span class="font-mono text-xl text-white">{{
                result.deleted.sessions
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDev = import.meta.dev;

definePageMeta({
  layout: "thin",
});

// Prevent indexing
useSeoMeta({
  title: "Admin Reset",
  robots: "noindex, nofollow",
});

useHead({
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const secret = ref("");
const isLoading = ref(false);
const result = ref<{
  success: boolean;
  message: string;
  deleted?: {
    scores: number;
    rounds: number;
    leaderboard: number;
    sessions: number;
  };
} | null>(null);

async function handleReset() {
  if (!isDev && !secret.value) return;

  isLoading.value = true;
  result.value = null;

  try {
    const response = await $fetch<{
      success: boolean;
      data?: {
        message: string;
        deleted: {
          scores: number;
          rounds: number;
          leaderboard: number;
          sessions: number;
        };
      };
      error?: string;
    }>("/api/resetScores", {
      method: "POST",
      body: { secret: secret.value || undefined },
    });

    if (response.success && response.data) {
      result.value = {
        success: true,
        message: response.data.message,
        deleted: response.data.deleted,
      };
      if (!isDev) secret.value = "";
    } else {
      result.value = {
        success: false,
        message: response.error || "Unknown error",
      };
    }
  } catch (error: any) {
    result.value = {
      success: false,
      message: error?.data?.error || error?.message || "Request failed",
    };
  } finally {
    isLoading.value = false;
  }
}
</script>
