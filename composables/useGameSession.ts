import { ref, onMounted } from "vue";
import { logError } from "~/utils/client-logger";
import { createTimeoutSignal } from "~/utils/fetch";
import type { Player } from "~/types/player";

/**
 * Round/Session state interface
 * @interface RoundState
 * @property {string} id - Unique round identifier
 * @property {string} token - Authorization token for the round
 * @property {string} sessionId - Parent session ID
 * @property {number} expiresAt - Timestamp when round expires
 * @property {number} cluesUsed - Number of clues revealed
 */
interface RoundState {
  id: string;
  token: string;
  sessionId: string;
  expiresAt: number;
  cluesUsed: number;
}

/**
 * Manages game session and round state
 * Handles session ID persistence and player loading
 *
 * @example
 * ```ts
 * const { sessionId, round, player, isLoading, loadPlayer } = useGameSession();
 * await loadPlayer(); // Load random player
 * await loadPlayer("Harry Kane"); // Load specific player
 * ```
 */
export function useGameSession() {
  const sessionId = ref<string | null>(null);
  const player = ref<Player | null>(null);
  const round = ref<RoundState | null>(null);
  const currentName = ref<string | undefined>(undefined);
  const isLoading = ref(false);
  const errorMessage = ref("");
  const isError = ref(false);

  /**
   * Ensures a session ID exists, creating or loading from storage
   * @returns {string} The current or newly created session ID
   */
  function ensureSessionId() {
    if (sessionId.value) return sessionId.value;
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem("footyguess_session_id");
        if (stored) {
          sessionId.value = stored;
          return stored;
        }
      } catch (error) {
        // localStorage may be blocked (private browsing, security settings)
        console.warn("[useGameSession] localStorage read failed:", error);
      }
    }
    const generated = crypto.randomUUID();
    sessionId.value = generated;
    if (import.meta.client) {
      try {
        localStorage.setItem("footyguess_session_id", generated);
      } catch (error) {
        console.warn("[useGameSession] localStorage write failed:", error);
      }
    }
    return generated;
  }

  /**
   * Loads a player from the server
   * @param {string} [name] - Optional player name to load. If undefined, loads random player
   */
  async function loadPlayer(name?: string) {
    isLoading.value = true;
    errorMessage.value = "";
    isError.value = false;

    try {
      const sid = ensureSessionId();
      const endpoint = name
        ? `/api/getPlayer?name=${encodeURIComponent(name)}&sessionId=${encodeURIComponent(sid)}`
        : `/api/randomPlayer?sessionId=${encodeURIComponent(sid)}`;

      const response = await $fetch<
        {
          round: RoundState;
        } & Player
      >(endpoint, {
        signal: createTimeoutSignal(15000),
      });

      player.value = response;
      currentName.value = response?.name;
      round.value = response.round;
      sessionId.value = response.round.sessionId;
      if (import.meta.client) {
        try {
          localStorage.setItem(
            "footyguess_session_id",
            response.round.sessionId,
          );
        } catch (error) {
          console.warn("[useGameSession] localStorage write failed:", error);
        }
      }
      if (import.meta.dev) {
        console.log("[footyguess] Loaded player:", response);
      }
      errorMessage.value = "";
      return;
    } catch (err) {
      logError("useGameSession", "Failed to load player", err);
      errorMessage.value =
        "Couldn't fetch the mystery player. Please try again.";
      player.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    sessionId,
    player,
    round,
    currentName,
    isLoading,
    errorMessage,
    isError,
    ensureSessionId,
    loadPlayer,
  };
}
