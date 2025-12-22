import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCluePool } from "~/composables/useCluePool";

const player = ref({
  birthdate: "1990-01-04",
  nationalities: ["Germany"],
  foot: "right",
  height_cm: 183,
  main_position: "CM",
  secondary_positions: ["AM", "DM"],
  total_stats: { appearances: 100, goals: 10, assists: 20, yellow_cards: 5, red_cards: 1 },
  stats: [{ competition: "Bundesliga", appearances: 50 }],
  birthplace: "Greifswald",
} as any);

describe("useCluePool", () => {
  it("selects up to 5 clues and reveals one at a time", () => {
    const isLoading = ref(false);
    const {
      availableClues,
      revealedClues,
      hiddenClueLabels,
      tipButtonDisabled,
      selectRandomClues,
      revealNextClue,
    } = useCluePool(player, { isLoading });

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    selectRandomClues();

    expect(availableClues.value.length).toBeLessThanOrEqual(5);
    expect(revealedClues.value).toHaveLength(0);
    expect(hiddenClueLabels.value.length).toBeGreaterThan(0);
    expect(tipButtonDisabled.value).toBe(false);

    revealNextClue();
    expect(revealedClues.value.length).toBe(1);

    randomSpy.mockRestore();
  });
});
