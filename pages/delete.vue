<template>
  <div class="w-full space-y-8">
    <div class="text-center">
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/50"
      >
        <UIcon
          name="i-lucide-user-x"
          class="h-8 w-8 text-orange-400"
        />
      </div>
      <h1 class="mt-4 text-3xl font-bold tracking-tight text-white">
        Delete Session
      </h1>
      <p class="text-primary-200/60 mt-2">
        Remove all your game data permanently.
      </p>
    </div>

    <div class="space-y-6">
      <div
        class="rounded-xl border border-orange-500/10 bg-orange-500/5 p-4 backdrop-blur-sm"
      >
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-alert-triangle"
            class="mt-0.5 h-5 w-5 shrink-0 text-orange-400"
          />
          <div class="space-y-1 text-sm">
            <p class="font-medium text-orange-200">What will be deleted?</p>
            <ul class="list-disc pl-4 text-orange-200/60">
              <li>Your session and all settings</li>
              <li>All your leaderboard entries</li>
              <li>All your round scores and history</li>
              <li>Your streak and total score records</li>
            </ul>
          </div>
        </div>
      </div>

      <form
        @submit.prevent="handleDelete"
        class="space-y-6"
      >
        <UFormField
          label="Session ID"
          required
          help="Enter the session ID you want to delete"
        >
          <UInput
            v-model="sessionId"
            type="text"
            placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx"
            class="w-full font-mono"
            :disabled="isLoading"
            size="lg"
            color="neutral"
            icon="i-lucide-key"
          />
        </UFormField>

        <div
          v-if="isOwnSession"
          class="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3"
        >
          <div class="flex items-center gap-2 text-sm text-yellow-200">
            <UIcon
              name="i-lucide-info"
              class="h-4 w-4 shrink-0"
            />
            <span
              >This is your current session. Your local data will also be
              cleared.</span
            >
          </div>
        </div>

        <div class="grid gap-3">
          <UButton
            block
            size="xl"
            color="error"
            :loading="isLoading"
            :disabled="!sessionId || isLoading"
            icon="i-lucide-trash-2"
            @click="handleDelete"
          >
            Delete Session
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
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "thin",
});

useSeoMeta({
  title: "Delete Session",
  description:
    "Delete your FootyGuess session and all associated game data permanently.",
});

const toast = useToast();
const router = useRouter();

const sessionId = ref("");
const isLoading = ref(false);

// Check if this is the user's own session
const ownSessionId = ref<string | null>(null);
const isOwnSession = computed(() => {
  return ownSessionId.value && sessionId.value === ownSessionId.value;
});

// Pre-fill with user's session ID if available
onMounted(() => {
  if (import.meta.client) {
    const stored = localStorage.getItem("footyguess_session_id");
    if (stored) {
      ownSessionId.value = stored;
      sessionId.value = stored;
    }
  }
});

async function handleDelete() {
  if (!sessionId.value) return;

  isLoading.value = true;

  try {
    const response = await $fetch<{
      success: boolean;
      data?: {
        message: string;
        sessionId: string;
        deleted: {
          scores: number;
          rounds: number;
          leaderboard: number;
          sessions: number;
        };
      };
      error?: string;
    }>("/api/deleteSession", {
      method: "POST",
      body: { sessionId: sessionId.value },
    });

    if (response.success && response.data) {
      const { deleted } = response.data;

      // Clear localStorage if it was the user's own session
      if (isOwnSession.value && import.meta.client) {
        // Clear all footyguess-related localStorage items
        localStorage.removeItem("footyguess_session_id");
        localStorage.removeItem("footyguess_session_nickname");
        localStorage.removeItem("footyguess_round_token");
        localStorage.removeItem("footyguess_streak");
        localStorage.removeItem("footyguess_best_streak");
        localStorage.removeItem("footyguess_streak_difficulty");
        localStorage.removeItem("footyguess_difficulty");
        localStorage.removeItem("footyguess_last_player");
        localStorage.removeItem("footyguess_livescore_hidden");
        ownSessionId.value = null;
      }

      toast.add({
        title: "Session Deleted",
        description: `Removed ${deleted.scores} scores, ${deleted.rounds} rounds, ${deleted.leaderboard} leaderboard entries`,
        color: "primary",
        icon: "i-lucide-check-circle",
      });

      // Clear input and redirect after short delay
      sessionId.value = "";
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } else {
      toast.add({
        title: "Deletion Failed",
        description: response.error || "Unknown error occurred",
        color: "error",
        icon: "i-lucide-x-circle",
      });
    }
  } catch (error: any) {
    toast.add({
      title: "Deletion Failed",
      description: error?.data?.error || error?.message || "Request failed",
      color: "error",
      icon: "i-lucide-x-circle",
    });
  } finally {
    isLoading.value = false;
  }
}
</script>
