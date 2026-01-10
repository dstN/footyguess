<template>
  <UModal
    v-model:open="isOpen"
    title="Highscores"
    description="Top players across all categories"
  >
    <UButton
      icon="i-lucide-trophy"
      :color="buttonColor"
      variant="ghost"
      class="cursor-pointer"
      @click="openModal"
    >
      <span class="hidden md:inline">Highscores</span>
    </UButton>

    <template #body>
      <UTabs
        v-model="activeTab"
        :items="tabs"
        class="w-full"
      >
        <template #content="{ item }">
          <div class="mt-4 space-y-3">
            <!-- Player search for round tab -->
            <div
              v-if="item.value === 'round'"
              class="space-y-3"
            >
              <!-- Current player display -->
              <div
                v-if="selectedPlayerName"
                class="border-primary-500/30 bg-primary-500/10 flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-user"
                    class="text-primary-400 h-4 w-4"
                  />
                  <span class="text-sm text-slate-200">{{
                    selectedPlayerName
                  }}</span>
                </div>
                <UButton
                  v-if="selectedPlayerId !== lastPlayerId"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="cursor-pointer"
                  @click="clearPlayerSelection"
                />
              </div>

              <!-- Player search input -->
              <div class="relative">
                <UInput
                  v-model="playerSearch"
                  placeholder="Search for a player..."
                  icon="i-lucide-search"
                  class="w-full"
                  @input="debouncedSearchPlayers"
                />
                <!-- Search results dropdown -->
                <div
                  v-if="
                    playerSearchResults.length > 0 && playerSearch.length > 0
                  "
                  class="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
                >
                  <button
                    v-for="player in playerSearchResults"
                    :key="player.id"
                    class="w-full px-3 py-2 text-left text-sm text-slate-200 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-slate-700"
                    @click="selectPlayer(player)"
                  >
                    {{ player.name }}
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="isLoading"
              class="flex items-center justify-center py-8"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="text-primary-400 h-6 w-6 animate-spin"
              />
            </div>

            <div
              v-else-if="getEntriesForTab(item.value).length === 0"
              class="py-8 text-center text-slate-500"
            >
              <template v-if="item.value === 'round' && selectedPlayerName">
                No scores for {{ selectedPlayerName }} yet.
              </template>
              <template v-else> No entries yet. Be the first! </template>
            </div>

            <div
              v-else
              class="space-y-2"
            >
              <div
                v-for="(entry, index) in getEntriesForTab(item.value)"
                :key="entry.id"
                class="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-white/5 px-4 py-3"
                :class="{
                  'border-primary-500/50 bg-primary-500/10': index === 0,
                  'border-amber-500/30 bg-amber-500/5': index === 1,
                  'border-orange-500/30 bg-orange-500/5': index === 2,
                }"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                  :class="{
                    'bg-primary-500/20 text-primary-300': index === 0,
                    'bg-amber-500/20 text-amber-300': index === 1,
                    'bg-orange-500/20 text-orange-300': index === 2,
                    'bg-slate-700/50 text-slate-400': index > 2,
                  }"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 truncate">
                  <div class="text-slate-200">{{ entry.nickname }}</div>
                  <div
                    v-if="
                      entry.player_name &&
                      item.value === 'round' &&
                      !selectedPlayerId
                    "
                    class="text-xs text-slate-500"
                  >
                    {{ entry.player_name }}
                  </div>
                </div>
                <div
                  class="font-mono text-lg font-bold"
                  :class="getValueColor(item.value)"
                >
                  {{ formatValue(entry.value, item.value) }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton
          color="primary"
          class="cursor-pointer"
          @click="close"
        >
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, inject, onBeforeUnmount } from "vue";

interface LeaderboardEntry {
  id: number;
  nickname: string;
  value: number;
  type: string;
  created_at: number;
  player_name?: string;
  player_id?: number;
}

interface LeaderboardData {
  round: LeaderboardEntry[];
  total: LeaderboardEntry[];
  streak: LeaderboardEntry[];
}

interface PlayerSearchResult {
  id: number;
  name: string;
}

const props = withDefaults(
  defineProps<{
    lastPlayerId?: number | null;
    lastPlayerName?: string | null;
    buttonColor?: "primary" | "neutral" | "error" | "success" | "warning";
  }>(),
  {
    buttonColor: "neutral",
  },
);

const setModalOpen = inject<(open: boolean) => void>("setModalOpen");

const isOpen = ref(false);
const activeTab = ref("round");
const isLoading = ref(false);
const leaderboardData = ref<LeaderboardData>({
  round: [],
  total: [],
  streak: [],
});

// Player search state
const playerSearch = ref("");
const playerSearchResults = ref<PlayerSearchResult[]>([]);
const selectedPlayerId = ref<number | null>(null);
const selectedPlayerName = ref<string | null>(null);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Notify layout when modal opens/closes
watch(isOpen, (open) => {
  setModalOpen?.(open);
});

function openModal() {
  isOpen.value = true;

  // Set the last player as default if available
  if (props.lastPlayerId && props.lastPlayerName) {
    selectedPlayerId.value = props.lastPlayerId;
    selectedPlayerName.value = props.lastPlayerName;
  }

  fetchLeaderboard();
}

const tabs = [
  { label: "Players", value: "round", icon: "i-lucide-user" },
  { label: "Session", value: "total", icon: "i-lucide-sigma" },
  { label: "Streak", value: "streak", icon: "i-lucide-flame" },
];

async function fetchLeaderboard() {
  isLoading.value = true;
  try {
    // If a player is selected for round tab, fetch player-specific data
    if (selectedPlayerId.value && activeTab.value === "round") {
      const data = await $fetch<{
        round: LeaderboardEntry[];
        playerName: string | null;
      }>(
        `/api/leaderboard?type=round&playerId=${selectedPlayerId.value}&limit=10`,
      );
      leaderboardData.value.round = data.round || [];
      if (data.playerName) {
        selectedPlayerName.value = data.playerName;
      }
    } else {
      const data = await $fetch<LeaderboardData>(
        "/api/leaderboard?type=all&limit=10",
      );
      leaderboardData.value = {
        round: data.round || [],
        total: data.total || [],
        streak: data.streak || [],
      };
    }
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
  } finally {
    isLoading.value = false;
  }
}

// Re-fetch when tab changes
watch(activeTab, () => {
  fetchLeaderboard();
});

// Re-fetch when selected player changes
watch(selectedPlayerId, () => {
  if (activeTab.value === "round") {
    fetchLeaderboard();
  }
});

function debouncedSearchPlayers() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (playerSearch.value.length < 2) {
    playerSearchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const data = await $fetch<{ players: PlayerSearchResult[] }>(
        `/api/leaderboard?searchPlayer=${encodeURIComponent(playerSearch.value)}`,
      );
      playerSearchResults.value = data.players || [];
    } catch (error) {
      console.error("Failed to search players:", error);
      playerSearchResults.value = [];
    }
  }, 300);
}

function selectPlayer(player: PlayerSearchResult) {
  selectedPlayerId.value = player.id;
  selectedPlayerName.value = player.name;
  playerSearch.value = "";
  playerSearchResults.value = [];
}

function clearPlayerSelection() {
  selectedPlayerId.value = props.lastPlayerId ?? null;
  selectedPlayerName.value = props.lastPlayerName ?? null;
  playerSearch.value = "";
  playerSearchResults.value = [];
}

function getEntriesForTab(tabValue: string): LeaderboardEntry[] {
  return leaderboardData.value[tabValue as keyof LeaderboardData] || [];
}

function getValueColor(type: string): string {
  switch (type) {
    case "round":
      return "text-primary-400";
    case "total":
      return "text-emerald-400";
    case "streak":
      return "text-mew-500";
    default:
      return "text-slate-200";
  }
}

function formatValue(value: number, type: string): string {
  if (type === "streak") {
    return `${value}🔥`;
  }
  return value.toLocaleString();
}

onBeforeUnmount(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
});
</script>
