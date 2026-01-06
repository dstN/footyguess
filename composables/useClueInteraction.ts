import { computed, ref, type Ref } from "vue";
import type { useClueData } from "./useClueData";
import type { Clue } from "./useClueData";

/**
 * Composable for handling user interactions with clues.
 *
 * Responsibilities:
 * - Manage clue revelation state and UI
 * - Handle reveal button disabled state
 * - Manage loading state during API calls
 * - Cap maximum clues at 10
 * - Toast notifications for clue reveals
 *
 * @param clueData - Result from useClueData composable
 * @param opts - Configuration options (isLoading ref)
 * @returns Interaction methods and state
 *
 * @example
 * const clueData = useClueData(playerRef);
 * const { revealNextClue, tipButtonDisabled } = useClueInteraction(clueData);
 */
export function useClueInteraction(
  clueData: ReturnType<typeof useClueData>,
  opts: { isLoading?: Ref<boolean> } = {},
) {
  const toast = useToast();
  const isLoading = opts.isLoading ?? ref(false);
  const MAX_REVEALED_CLUES = 10;

  const tipButtonDisabled = computed(
    () =>
      isLoading.value ||
      !clueData.hiddenClues.value.length ||
      clueData.revealedTips.value.length >= MAX_REVEALED_CLUES,
  );

  function revealNextClue() {
    if (tipButtonDisabled.value) return;

    const hidden = clueData.hiddenClues.value;
    if (!hidden.length) return;

    // Pick random hidden clue
    const next = hidden[Math.floor(Math.random() * hidden.length)];
    if (!next) return;

    // Reveal it
    clueData.revealedTips.value.push(next.key);

    // Show notification
    toast.add({
      title: "New tip unlocked",
      description: next.value ? `${next.label}: ${next.value}` : next.label,
      color: "primary",
      icon: "i-lucide-sparkles",
    });
  }

  return {
    tipButtonDisabled,
    revealNextClue,
  };
}
