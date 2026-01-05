import { type Ref } from "vue";
import type { Player } from "~/types/player";
import { useClueData } from "./useClueData";
import { useClueInteraction } from "./useClueInteraction";

/**
 * Main composable for managing the pool of clues about a player.
 *
 * Orchestrates two focused sub-composables:
 * - useClueData: Handles data generation and formatting
 * - useClueInteraction: Handles user interactions with clues
 *
 * This keeps the file focused on orchestration rather than implementation details.
 *
 * @param player - Reactive reference to the current player
 * @param opts.isLoading - Optional loading state reference
 * @returns Combined state and methods from both composables
 *
 * @example
 * const { revealedClues, hiddenClueLabels, selectRandomClues, revealNextClue }
 *   = useCluePool(playerRef, { isLoading: loadingRef });
 */
export function useCluePool(
  player: Ref<Player | null>,
  opts: { isLoading?: Ref<boolean> } = {},
) {
  // Data management
  const clueData = useClueData(player);

  // User interaction handling
  const interaction = useClueInteraction(clueData, { isLoading: opts.isLoading });

  // Re-export all state and methods for backward compatibility
  return {
    // Data exports
    cluePool: clueData.cluePool,
    availableClues: clueData.availableClues,
    revealedClues: clueData.revealedClues,
    hiddenClueLabels: clueData.hiddenClueLabels,
    
    // Interaction exports
    tipButtonDisabled: interaction.tipButtonDisabled,
    revealNextClue: interaction.revealNextClue,
    selectRandomClues: clueData.selectRandomClues,
  };
}

export type { Clue, ClueKey } from "./useClueData";
