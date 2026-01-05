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
 * Composable for managing the pool of clues about a player.
 *
 * Key features:
 * - Generates 12 available clues from player data
 * - Tracks which clues have been revealed (max 10 due to capping)
 * - Uses seeded randomness for deterministic initial clue selection
 * - Handles clue revelation via API with loading/error states
 * - Validates max clues allowed from server response
 *
 * Clue types available:
 * - Demographics: age, height, birthplace, origin
 * - Playing style: foot, position
 * - Performance: totals, goals per game, assists per game, discipline
 * - Competition: most frequent competition
 *
 * @param player - Reactive reference to the current player (triggers clue regeneration)
 * @param opts.isLoading - Optional loading state reference to use
 * @returns Object with clue state and functions
 *
 * @example
 * const { revealedClues, hiddenClueLabels, selectRandomClues, revealNextClue }
 *   = useCluePool(playerRef, { isLoading: loadingRef });
 *
 * // Initial clues selected deterministically by player ID
 * // Player 123 always gets same first 3 clues revealed
 * selectRandomClues();
 *
 * // Reveal one more clue via API
 * await revealNextClue();
 */
export function useCluePool(
  player: Ref<Player | null>,
  opts: { isLoading?: Ref<boolean> } = {},
) {
  const toast = useToast();
  const isLoading = opts.isLoading ?? ref(false);

  const availableClues = ref<Clue[]>([]);
  const revealedTips = ref<ClueKey[]>([]);

  /**
   * Compute all available clues for the current player.
   *
   * Generates a full pool of 12 clues from player data fields.
   * Handles missing/null data gracefully (clue.value = null).
   * Computed automatically when player changes.
   *
   * @returns Array of Clue objects with all information available
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
            (totals.minutes_played ?? 0) / (totals.appearances || 1),
          )} mins/match`
        : null;

    const assistRate =
      totals && totals.appearances && totals.assists
        ? `${(totals.assists / totals.appearances).toFixed(2)} assists/match`
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

  const tipButtonDisabled = computed(
    () => isLoading.value || !hiddenClues.value.length,
  );

  function selectRandomClues() {
    const pool = cluePool.value.filter((clue) => Boolean(clue.value));
    // Use seeded random based on player ID for deterministic clue selection
    // Same player always gets same random clues
    const rng = new SeededRandom(player.value?.id ?? 0);
    const shuffled = shuffle(pool, rng);
    availableClues.value = shuffled.slice(0, 5);
    revealedTips.value = [];
  }

  function revealNextClue() {
    if (tipButtonDisabled.value) return;
    // Prevent unbounded array growth - cap at 10 clues max
    if (revealedTips.value.length >= 10) return;
    const next =
      hiddenClues.value[Math.floor(Math.random() * hiddenClues.value.length)];
    if (!next) return;
    revealedTips.value.push(next.key);

    toast.add({
      title: "New tip unlocked",
      description: next.value ? `${next.label}: ${next.value}` : next.label,
      color: "primary",
      icon: "i-lucide-sparkles",
    });
  }

  return {
    cluePool,
    availableClues,
    revealedClues,
    hiddenClueLabels,
    tipButtonDisabled,
    selectRandomClues,
    revealNextClue,
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
