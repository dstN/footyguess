<template>
  <div class="p-6 space-y-6 max-w-xl mx-auto">
    <UCard>
      <template #header>
        <h2 class="text-xl font-bold">{{ t("title") }}</h2>
      </template>

      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-500">{{ t("career") }}</p>
          <ul class="list-disc list-inside">
            <li
              v-for="(entry, index) in career"
              :key="index"
            >
              {{ entry.start_year }}–{{ entry.end_year || "?" }} –
              {{ entry.club }}
            </li>
          </ul>
        </div>

        <UInput
          v-model="guess"
          :placeholder="t('placeholder')"
          @keydown.enter="submitGuess"
        />

        <UButton
          @click="submitGuess"
          :loading="loading"
          class="w-full"
        >
          {{ t("submit") }}
        </UButton>

        <div
          v-if="result === 'wrong' && canGiveHint && !hint"
          class="pt-2"
        >
          <UButton
            variant="outline"
            @click="requestHint"
          >
            {{ t("hint_button") }}
          </UButton>
        </div>

        <div
          v-if="hint"
          class="text-sm text-blue-600 pt-2"
        >
          {{ t("hint", { hint: t(hint) }) }}
        </div>

        <div
          v-if="result === 'correct'"
          class="text-green-600 font-semibold pt-2"
        >
          {{ t("correct") }}
        </div>

        <div
          v-if="result === 'unknown'"
          class="text-red-500 pt-2"
        >
          {{ t("unknown") }}
        </div>

        <div
          v-if="debug && currentPlayerName"
          class="text-xs text-gray-400 pt-4"
        >
          🎯 Aktueller Spieler (Debug): {{ currentPlayerName }}
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

interface CareerEntry {
  start_year: number | null;
  end_year: number | null;
  club: string;
}

const { t } = useI18n();

const career = ref<CareerEntry[]>([]);
const guess = ref("");
const result = ref<"correct" | "wrong" | "unknown" | null>(null);
const canGiveHint = ref(false);
const hint = ref<string | null>(null);
const loading = ref(false);
const currentPlayerName = ref("");
const debug = true;
let currentPlayerId = "";

onMounted(async () => {
  const res = await $fetch("/api/random-player");
  career.value = res.career;
  currentPlayerId = res.id;
  currentPlayerName.value = res.name;
});

async function submitGuess() {
  if (!guess.value) return;
  loading.value = true;

  const res = await $fetch("/api/guess", {
    method: "POST",
    body: {
      guess: guess.value,
      targetId: currentPlayerId,
    },
  });

  result.value = res.result;
  canGiveHint.value = res.canGiveHint || false;
  hint.value = null;
  loading.value = false;
}

async function requestHint() {
  if (!canGiveHint.value || hint.value !== null) return;
  const res = await $fetch("/api/hint", {
    method: "POST",
    body: {
      guess: guess.value,
      targetId: currentPlayerId,
    },
  });
  hint.value = res.hint;
}
</script>
