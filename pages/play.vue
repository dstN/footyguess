<template>
  <main class="flex flex-1 flex-col gap-6 text-slate-100">
    <header class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <UBadge
          color="primary"
          variant="soft"
          class="tracking-[0.18em] uppercase"
        >
          Mystery player
        </UBadge>
        <span class="text-xs tracking-[0.26em] text-slate-400 uppercase">
          Cyber round
        </span>
      </div>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="space-y-1">
          <h1
            class="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white"
          >
            Footyguess: Neon Transfer Trail
          </h1>
          <p class="text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Decode the career path, grab a random tip, and lock in your guess.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            icon="i-lucide-shuffle"
            color="neutral"
            variant="ghost"
            :disabled="isLoading"
            @click="loadPlayer()"
          >
            New mystery
          </UButton>
          <UButton
            icon="i-lucide-sparkles"
            color="primary"
            variant="solid"
            :disabled="tipButtonDisabled"
            @click="revealNextClue"
          >
            Get a tip
          </UButton>
        </div>
      </div>
    </header>

    <UAlert
      v-if="errorMessage"
      color="error"
      icon="i-lucide-alert-triangle"
      :title="errorMessage"
      class="border border-red-500/30 bg-red-500/10"
    />

    <section class="space-y-4">
      <div
        class="border-primary-900/60 flex flex-wrap items-center gap-2 rounded-2xl border bg-slate-900/60 px-3 py-3"
      >
        <p class="text-primary-200 text-xs tracking-[0.18em] uppercase">
          Clues
        </p>
        <TransitionGroup
          name="fade"
          tag="div"
          class="flex flex-wrap gap-2"
        >
          <UBadge
            v-for="clue in revealedClues"
            :key="clue.key"
            color="primary"
            variant="soft"
            class="bg-primary-500/10 text-xs"
          >
            {{ clue.label }}: {{ clue.value }}
          </UBadge>
        </TransitionGroup>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="clue in hiddenClueLabels"
            :key="clue"
            color="neutral"
            variant="soft"
            class="bg-slate-800/80 text-[11px] tracking-[0.12em] uppercase"
          >
            {{ clue }} locked
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-1">
        <UCard
          class="border-primary-900/50 relative overflow-hidden border bg-slate-950/60"
        >
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <p
                  class="text-primary-200/80 text-xs tracking-[0.26em] uppercase"
                >
                  Club timeline
                </p>
                <p class="text-lg font-semibold text-white">
                  Career history (clubs only)
                </p>
                <p class="text-xs text-slate-400">
                  {{ careerTimeline.length }} transfers loaded
                </p>
              </div>
              <UBadge
                v-if="currentName"
                color="primary"
                variant="soft"
                class="bg-primary-500/10 text-primary-100 text-xs"
              >
                New drop incoming
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div
              v-if="isLoading"
              class="space-y-4"
            >
              <USkeleton
                v-for="n in 4"
                :key="n"
                class="h-16 rounded-xl bg-white/5"
              />
            </div>

            <div
              v-else-if="careerTimeline.length"
              class="border-primary-700/40 relative space-y-5 border-l pl-4"
            >
              <div
                v-for="item in careerTimeline"
                :key="item.id"
                class="border-primary-900/40 relative rounded-xl border bg-white/5 px-4 py-3 shadow-sm backdrop-blur-sm"
              >
                <span
                  class="bg-primary-400 absolute top-4 -left-2 block h-3 w-3 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                />
                <p class="text-primary-200 text-xs tracking-[0.14em] uppercase">
                  {{ item.date }}
                </p>
                <div class="flex items-center gap-3 text-sm text-slate-200">
                  <span class="font-semibold text-white">{{ item.from }}</span>
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="text-primary-200"
                  />
                  <span class="font-semibold text-white">{{ item.to }}</span>
                </div>
                <p class="text-sm text-slate-300">
                  {{ item.description }}
                </p>
              </div>
            </div>

            <UEmpty
              v-else
              icon="i-lucide-compass"
              title="No timeline data"
              description="We couldn't find transfers for this player."
              class="bg-white/5"
            />
          </div>
        </UCard>
      </div>
    </section>

    <Teleport to="body">
      <div
        class="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-5xl justify-center px-4 pb-0"
      >
        <div
          class="w-full rounded-t-3xl bg-white/5 p-6 text-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xs sm:p-8"
        >
          <UForm
            :schema="schema"
            :state="formState"
            @submit="onSubmit"
            class="flex w-full flex-row items-center gap-2"
          >
            <UInputMenu
              v-model="formState.guess"
              v-model:search-term="searchTerm"
              ref="guessInput"
              placeholder="Type or search the player's name"
              :items="suggestions"
              :color="isError ? 'error' : 'primary'"
              size="lg"
              class="min-w-[14rem] flex-1 bg-slate-900/20 text-white"
              :disabled="isLoading"
              :highlight="true"
              :ignore-filter="true"
              :create-item="false"
              variant="none"
              trailing
              @update:search-term="onSearch"
              @keydown.enter.prevent="submitGuessViaEnter"
              :content="{
                position: 'popper',
                align: 'start',
                sideOffset: 38,
              }"
            >
              <template #trailing>
                <UButton
                  v-if="hasGuess"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="sm:hidden"
                  aria-label="Clear"
                  @click.stop="clearGuess"
                />
              </template>
            </UInputMenu>
            <div class="flex flex-nowrap gap-2 sm:justify-end">
              <UButton
                type="submit"
                color="primary"
                variant="solid"
                size="lg"
                :loading="isLoading"
              >
                Check
              </UButton>
              <UButton
                variant="ghost"
                color="neutral"
                size="lg"
                class="hidden sm:flex"
                :disabled="isLoading"
                @click="clearGuess"
              >
                Clear
              </UButton>
            </div>
          </UForm>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import * as v from "valibot";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player } from "~/types/player";

type ClueKey =
  | "age"
  | "origin"
  | "foot"
  | "position"
  | "height"
  | "birthplace"
  | "totals"
  | "minutesPerGoal"
  | "discipline"
  | "mostAppearances";

interface Clue {
  key: ClueKey;
  label: string;
  value: string | null;
  icon: string;
  accent: "primary" | "secondary" | "info" | "success" | "warning";
}

const fallbackName = "Marco Reus";
const playerNamePool = [
  "Marco Reus",
  "Karim Benzema",
  "Robert Lewandowski",
  "Toni Kroos",
  "Cristiano Ronaldo",
  "Lionel Messi",
  "Neymar",
  "Erling Haaland",
];

const router = useRouter();
const toast = useToast();
const triggerShake = inject<() => void>("triggerShake");

const player = ref<Player | null>(null);
const currentName = ref(fallbackName);
const isLoading = ref(false);
const errorMessage = ref("");
const isError = ref(false);
const guessInput = ref<any>(null);
const revealedTips = ref<ClueKey[]>([]);
const searchTerm = ref("");
const availableClues = ref<Clue[]>([]);
const suggestions = ref<string[]>([]);
const isSearching = ref(false);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

useHead({
  title: "Footyguess — Mystery Player",
});

const schema = v.object({
  guess: v.pipe(v.string(), v.minLength(1, "Please guess a player")),
});

type Schema = v.InferOutput<typeof schema>;

const formState = reactive<Schema>({
  guess: "",
});
const hasGuess = computed(() => formState.guess.trim().length > 0);

watch(
  () => formState.guess,
  () => {
    if (isError.value) isError.value = false;
  },
);

function scheduleSearch(term: string) {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
  searchTimeout.value = setTimeout(() => performSearch(term), 200);
}

async function performSearch(term: string) {
  const query = term.trim();
  if (query.length < 2) {
    suggestions.value = [];
    return;
  }

  try {
    isSearching.value = true;
    suggestions.value = await $fetch<string[]>(
      `/api/searchPlayers?q=${encodeURIComponent(query)}&limit=10`,
    );
  } catch (error) {
    console.error("Search failed", error);
  } finally {
    isSearching.value = false;
  }
}

const careerTimeline = computed(() => {
  if (!player.value?.transfers?.length) return [];
  const isRetired = player.value?.active === 0;

  const ordered = [...player.value.transfers].reverse();
  let prevWasFreeAgent = false;

  return ordered.map((transfer: any, index: number, arr: any[]) => {
    const isLatest = index === arr.length - 1;
    const rawTo =
      transfer.to_club || (isRetired && isLatest ? "Retired" : "Unknown club");
    const toLabel =
      !isRetired && !isLatest && rawTo === "Unknown club"
        ? "Free agent"
        : rawTo;

    const fromLabel =
      prevWasFreeAgent &&
      (transfer.from_club === null || transfer.from_club === "Unknown club")
        ? "Free agent"
        : transfer.from_club || "Unknown club";

    const baseDescription =
      formatFee(transfer.fee) ?? transfer.transfer_type ?? "Undisclosed";
    const hideDescription =
      toLabel === "Free agent" ||
      fromLabel === "Free agent" ||
      (isRetired && isLatest);
    const description = hideDescription ? "" : baseDescription;

    prevWasFreeAgent = toLabel === "Free agent";

    return {
      id: `${transfer.transfer_date ?? transfer.season ?? Math.random()}`,
      value: index,
      date: transfer.season || "Unknown season",
      from: fromLabel,
      to: toLabel,
      description,
      icon: "i-lucide-football",
    };
  });
});

const cluePool = computed<Clue[]>(() => {
  if (!player.value) return [];
  const age = getAge(player.value.birthdate);
  const origin =
    player.value.nationalities?.length && player.value.nationalities[0]
      ? player.value.nationalities.join(", ")
      : player.value.birthplace;
  const foot = player.value.foot ? capitalize(player.value.foot) : null;
  const height = player.value.height_cm ? `${player.value.height_cm} cm` : null;

  const positionParts = [
    player.value.main_position,
    ...(player.value.secondary_positions || []),
  ].filter(Boolean);
  const position = positionParts.length ? positionParts.join(" / ") : null;

  const totals = player.value.total_stats || {};
  const totalsClue =
    totals && (totals.appearances || totals.goals || totals.assists)
      ? `${totals.appearances ?? "?"} apps · ${totals.goals ?? "?"} G / ${
          totals.assists ?? "?"
        } A`
      : null;

  const minutesPerGoal =
    totals && totals.avg_minutes_per_goal
      ? `Avg ${totals.avg_minutes_per_goal} mins/goal`
      : null;

  const discipline =
    totals && (totals.yellow_cards || totals.red_cards)
      ? `${totals.yellow_cards ?? 0} yellows · ${totals.red_cards ?? 0} reds`
      : null;

  const mostApps = getMostAppearancesCompetition(player.value.stats);

  return [
    {
      key: "age",
      label: "Age",
      value: age ? `${age} years` : null,
      icon: "i-lucide-hourglass",
      accent: "primary",
    },
    {
      key: "height",
      label: "Height",
      value: height,
      icon: "i-lucide-ruler",
      accent: "info",
    },
    {
      key: "origin",
      label: "Origin",
      value: origin || null,
      icon: "i-lucide-map-pin",
      accent: "secondary",
    },
    {
      key: "birthplace",
      label: "Birthplace",
      value: player.value.birthplace || null,
      icon: "i-lucide-earth",
      accent: "secondary",
    },
    {
      key: "foot",
      label: "Strong foot",
      value: foot,
      icon: "i-lucide-footprints",
      accent: "info",
    },
    {
      key: "position",
      label: "Position",
      value: position,
      icon: "i-lucide-crosshair",
      accent: "success",
    },
    {
      key: "totals",
      label: "Career totals",
      value: totalsClue,
      icon: "i-lucide-bar-chart-3",
      accent: "primary",
    },
    {
      key: "minutesPerGoal",
      label: "Avg mins/goal",
      value: minutesPerGoal,
      icon: "i-lucide-gauge",
      accent: "info",
    },
    {
      key: "discipline",
      label: "Discipline",
      value: discipline,
      icon: "i-lucide-shield",
      accent: "warning",
    },
    {
      key: "mostAppearances",
      label: "Most appearances",
      value: mostApps,
      icon: "i-lucide-trophy",
      accent: "primary",
    },
  ];
});

const revealedClues = computed(() =>
  availableClues.value.filter((clue) => revealedTips.value.includes(clue.key)),
);

const hiddenClues = computed(() =>
  availableClues.value.filter(
    (clue) => !revealedTips.value.includes(clue.key) && Boolean(clue.value),
  ),
);

const hiddenClueLabels = computed(() =>
  hiddenClues.value.map((clue) => clue.label),
);

const tipButtonDisabled = computed(
  () => isLoading.value || !hiddenClues.value.length,
);

async function revealNextClue() {
  if (tipButtonDisabled.value) return;
  const next =
    hiddenClues.value[Math.floor(Math.random() * hiddenClues.value.length)];
  revealedTips.value.push(next.key);

  toast.add({
    title: "New tip unlocked",
    description: `${next.label}: ${next.value}`,
    color: "primary",
    icon: "i-lucide-sparkles",
  });
}

async function loadPlayer(name?: string) {
  const target =
    name ?? playerNamePool[Math.floor(Math.random() * playerNamePool.length)];
  const candidates = Array.from(new Set([target, fallbackName]));

  isLoading.value = true;
  errorMessage.value = "";
  isError.value = false;
  revealedTips.value = [];
  availableClues.value = [];

  try {
    for (const candidate of candidates) {
      try {
        currentName.value = candidate;
        player.value = await $fetch<Player>(
          `/api/getPlayer?name=${encodeURIComponent(candidate)}`,
        );
        console.log("[footyguess] Loaded player:", player.value);
        formState.guess = "";
        errorMessage.value = "";
        selectRandomClues();
        return;
      } catch (err) {
        console.error("Failed to load player", err);
        errorMessage.value = "Couldn't fetch the mystery player. Retrying...";
      }
    }

    toast.add({
      title: "No player available",
      description: "Please try again in a moment.",
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
    player.value = null;
  } finally {
    isLoading.value = false;
  }
}

function onSearch(term: string) {
  searchTerm.value = term;
  scheduleSearch(term);
}

function selectRandomClues() {
  const pool = cluePool.value.filter((clue) => Boolean(clue.value));
  const shuffled = shuffle(pool);
  availableClues.value = shuffled.slice(0, 5);
}

function formatFee(fee?: string | null) {
  if (!fee || fee === "-") return "free transfer";
  const numeric = Number(fee);
  if (Number.isNaN(numeric)) return fee;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(numeric);
}

function getMostAppearancesCompetition(stats: any[]) {
  if (!stats || !stats.length) return null;
  const sorted = [...stats].sort(
    (a, b) => (b.appearances ?? 0) - (a.appearances ?? 0),
  );
  const top = sorted[0];
  if (!top || !top.competition) return null;
  return `${top.competition} (${top.appearances ?? "?"} apps)`;
}

function getAge(birthdate?: string | null) {
  if (!birthdate) return null;
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return years > 0 ? years : null;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();
  const inputElement =
    guessInput.value?.inputRef?.input || guessInput.value?.inputRef;
  if (inputElement && typeof inputElement.focus === "function") {
    inputElement.focus();
  }
  if (!player.value) return;

  const rawGuess = event.data.guess as unknown;
  const normalizedGuess = getGuessValue(rawGuess).toLowerCase();
  const correct = player.value.name.trim().toLowerCase();

  if (normalizedGuess === correct) {
    isError.value = false;
    toast.add({
      title: "Correct!",
      description: "You cracked the code.",
      color: "primary",
      icon: "i-lucide-party-popper",
    });
    router.push("/won");
  } else {
    isError.value = true;
    toast.add({
      title: "Wrong player",
      description: "Try again—follow the neon clues.",
      color: "error",
      icon: "i-lucide-x-circle",
    });

    triggerShake?.();
  }
}

function submitGuessViaEnter() {
  onSubmit({
    preventDefault: () => {},
    data: { ...formState },
  } as FormSubmitEvent<Schema>);
}

function getGuessValue(raw: unknown) {
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object") {
    const maybeValue = (raw as any).value ?? (raw as any).label;
    if (typeof maybeValue === "string") return maybeValue.trim();
  }
  return "";
}

function clearGuess() {
  formState.guess = "";
  searchTerm.value = "";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

onMounted(async () => {
  await loadPlayer();
});
</script>

<style scoped>
.timeline :deep(.u-timeline-connector) {
  background: linear-gradient(
    180deg,
    rgba(99, 102, 241, 0.3),
    rgba(52, 211, 153, 0.3)
  );
  border-radius: 9999px;
}

.timeline :deep(.u-timeline-item) {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
