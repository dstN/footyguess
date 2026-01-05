import { computed, ref, type Ref } from "vue";
import type { Player } from "~/types/player";
import { SeededRandom } from "~/utils/seeded-random";

/** Types of clues available in the game */
export type ClueKey =
  | "age"
  | "origin"
  | "foot"
  | "position"
  | "height"
  | "birthplace"
  | "totals"
  | "minutesPerGoal"
  | "minutesPerMatch"
  | "assistRate"
  | "discipline"
  | "mostAppearances";

/** A single clue that can be revealed to the player */
export interface Clue {
  /** Unique identifier for the clue type */
  key: ClueKey;
  /** Human-readable label for UI display (e.g., "Age", "Position") */
  label: string;
  /** The actual clue value (e.g., "27 years", "Striker"), null if unknown */
  value: string | null;
  /** Icon class for the clue (lucide icon, e.g., "i-lucide-hourglass") */
  icon: string;
  /** Color accent for styling the clue badge */
  accent: "primary" | "secondary" | "info" | "success" | "warning";
}

/**
 * Composable for generating and managing clue data from player information.
 *
 * Responsibilities:
 * - Transform player data into displayable clues
 * - Format values appropriately (age, height, stats, etc.)
 * - Filter revealed vs hidden clues
 * - Generate clue pool and compute derived state
 *
 * @param player - Reactive reference to current player
 * @returns Computed clue state and helper functions
 *
 * @example
 * const { cluePool, revealedClues, hiddenClueLabels } = useClueData(playerRef);
 */
export function useClueData(player: Ref<Player | null>) {
  const availableClues = ref<Clue[]>([]);
  const revealedTips = ref<ClueKey[]>([]);

  /**
   * Generate all available clues for current player.
   * Pure data transformation from player object to clue array.
   */
  const cluePool = computed<Clue[]>(() => {
    if (!player.value) return [];
    const age = getAge(player.value.birthdate);
    const origin =
      player.value.nationalities?.length && player.value.nationalities[0]
        ? player.value.nationalities.join(", ")
        : player.value.birthplace;

    const cleanOrigin = cleanValue(origin);

    const rawFoot = player.value.foot?.trim();
    const foot =
      rawFoot && !/^n\/?a$/i.test(rawFoot) && rawFoot.toLowerCase() !== "na"
        ? capitalize(rawFoot)
        : null;

    const height = player.value.height_cm
      ? `${player.value.height_cm} cm`
      : null;

    const positionParts = [
      cleanValue(player.value.main_position),
      ...(player.value.secondary_positions || []).map((pos) => cleanValue(pos)),
    ].filter(Boolean) as string[];
    const position = positionParts.length ? positionParts.join(" / ") : null;

    const totals = player.value.total_stats || {};
    const totalsClue =
      totals && (totals.appearances || totals.goals || totals.assists)
        ? `${totals.appearances ?? "?"} apps — ${totals.goals ?? "?"} G / ${totals.assists ?? "?"} A`
        : null;

    const minutesPerGoal =
      totals && totals.avg_minutes_per_goal
        ? `Avg ${totals.avg_minutes_per_goal} mins/goal`
        : null;

    const minutesPerMatch =
      totals && totals.minutes_played && totals.appearances
        ? `${Math.round(
            (totals.minutes_played as number) / (totals.appearances as number),
          )} mins/match`
        : null;

    const assistRate =
      totals && totals.appearances && totals.assists
        ? `${((totals.assists as number) / (totals.appearances as number)).toFixed(2)} assists/match`
        : null;

    const discipline =
      totals && (totals.yellow_cards || totals.red_cards)
        ? `${totals.yellow_cards ?? 0} yellows — ${totals.red_cards ?? 0} reds`
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
        value: cleanOrigin,
        icon: "i-lucide-map-pin",
        accent: "secondary",
      },
      {
        key: "birthplace",
        label: "Birthplace",
        value: cleanValue(player.value.birthplace),
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
        key: "minutesPerMatch",
        label: "Avg mins/match",
        value: minutesPerMatch,
        icon: "i-lucide-timer",
        accent: "info",
      },
      {
        key: "assistRate",
        label: "Assist rate",
        value: assistRate,
        icon: "i-lucide-hand-coins",
        accent: "success",
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
    availableClues.value.filter((clue) =>
      revealedTips.value.includes(clue.key),
    ),
  );

  const hiddenClues = computed(() =>
    availableClues.value.filter(
      (clue) => !revealedTips.value.includes(clue.key) && Boolean(clue.value),
    ),
  );

  const hiddenClueLabels = computed(() =>
    hiddenClues.value.map((clue) => clue.label),
  );

  function selectRandomClues() {
    const pool = cluePool.value.filter((clue) => Boolean(clue.value));
    // Use seeded random based on player ID for deterministic clue selection
    const rng = new SeededRandom(player.value?.id ?? 0);
    const shuffled = shuffle(pool, rng);
    availableClues.value = shuffled.slice(0, 5);
    revealedTips.value = [];
  }

  return {
    cluePool,
    availableClues,
    revealedClues,
    hiddenClues,
    hiddenClueLabels,
    revealedTips,
    selectRandomClues,
  };
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

function cleanValue(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (["n/a", "na", "n\\a", "unknown", "-", "?"].includes(lower)) return null;
  return trimmed;
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

function shuffle<T>(arr: T[], rng?: SeededRandom): T[] {
  const copy: T[] = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng ? rng.nextInt(i + 1) : Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}
