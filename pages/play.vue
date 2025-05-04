<template>
  <div
    v-if="player"
    class="content relative flex flex-1 flex-col justify-between"
  >
    <h1 class="text-mint text-4xl font-bold text-shadow-md/30 dark:text-white">
      Who Am I?
    </h1>
    <div>
      <p class="text-mint mt-2 text-xl">Transferhistorie</p>

      <ul class="mt-6 space-y-2">
        <li
          v-for="(t, index) in player.transfers"
          :key="index"
          class="text-mint"
        >
          {{ t.season }}: {{ t.from_club || "?" }} → {{ t.to_club || "?" }}
          <span v-if="t.fee">({{ t.fee }})</span>
        </li>
      </ul>
    </div>
    <UForm
      :schema="schema"
      :state="formState"
      @submit="onSubmit"
    >
      <UFormGroup
        label="Your guess"
        name="guess"
      >
        <UInput
          v-model="formState.guess"
          ref="guessInput"
          placeholder="Your guess..."
          :color="isError ? 'error' : 'neutral'"
        />
      </UFormGroup>
      <UButton
        type="submit"
        variant="solid"
      >
        Check
      </UButton>
    </UForm>
  </div>

  <div
    v-else
    class="content relative flex flex-1 flex-col justify-center"
  >
    <h1 class="text-mint text-4xl font-bold text-shadow-md/30 dark:text-white">
      Loading...
    </h1>
  </div>
</template>

<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Transfer {
  season: string;
  from_club: string | null;
  to_club: string | null;
  fee?: string;
}

interface Player {
  name: string;
  transfers: Transfer[];
}

const player = ref<Player | null>(null);
const isError = ref(false);
const router = useRouter();

// ✅ Valibot Schema & State
const schema = v.object({
  guess: v.pipe(v.string(), v.minLength(1, "Please guess a player")),
});

type Schema = v.InferOutput<typeof schema>;
const formState = reactive<Schema>({
  guess: "",
});

const toast = useToast();
const triggerShake = inject<() => void>("triggerShake");
const guessInput = ref<any>(null);

function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();
  const inputElement = guessInput.value?.inputRef;
  if (inputElement) {
    inputElement.focus();
  }
  if (!player.value) return;

  const normalizedGuess = event.data.guess.trim().toLowerCase();
  const correct = player.value.name.trim().toLowerCase();

  if (normalizedGuess === correct) {
    isError.value = false;
    router.push("/won");
  } else {
    isError.value = true;
    toast.add({
      title: "Wrong Player",
      description: "Try again!",
      color: "error",
      icon: "i-heroicons-x-circle",
    });

    triggerShake?.();
  }
}

onMounted(async () => {
  const res = await fetch("/api/getPlayer?name=Marco%20Reus");
  player.value = await res.json();
  console.log("🎯 GELADENER SPIELER:", player.value);
});
</script>
