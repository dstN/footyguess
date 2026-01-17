import { ref, computed } from "vue";
import { logError } from "~/utils/client-logger";
import { createTimeoutSignal } from "~/utils/fetch";
import { announceToScreenReader } from "~/utils/accessibility";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player, UserSelectedDifficulty } from "~/types/player";
import type { GuessFormOutput } from "~/types/forms";
import type { ScoreBreakdown } from "~/server/utils/scoring";
import { useInterference } from "./useInterference";

interface RoundState {
  id: string;
  token: string;
  sessionId: string;
  expiresAt: number;
  cluesUsed: number;
}

export function useGuessSubmission(
  player: Ref<Player | null>,
  round: Ref<RoundState | null>,
  streak: Ref<number>,
  bestStreak: Ref<number>,
  selectedDifficulty: Ref<UserSelectedDifficulty>,
  onStreakUpdate: (
    streak: number,
    bestStreak: number,
    difficulty?: UserSelectedDifficulty,
  ) => void,
  onCorrectGuess: (
    playerName: string,
    difficulty: Player["difficulty"],
    breakdown: ScoreBreakdown,
    score: number,
    newStreak: number,
  ) => void,
  onIncorrectGuess: (wrongGuessCount?: number) => void,
  onError: (message: string) => void,
  onAborted?: (playerName: string) => void,
) {
  const isSubmitting = ref(false);
  const wrongGuessCount = ref(0);
  const { trigger: triggerInterference } = useInterference();

  /**
   * Validates and extracts guess value from various input formats
   * @param {unknown} raw - Raw input value from form
   * @returns {string} Sanitized guess value or empty string
   */
  function getGuessValue(raw: unknown): string {
    if (typeof raw === "string") return raw.trim();
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const maybeValue = obj.value ?? obj.label;
      if (typeof maybeValue === "string") return maybeValue.trim();
    }
    return "";
  }

  /**
   * Submits a guess to the server
   * Updates streak, shows toast, and routes on correct guess
   * @param {string} guess - The player name guess
   */
  async function submitGuess(guess: string) {
    if (!round.value) return;
    isSubmitting.value = true;

    try {
      const res = await $fetch<{
        correct: boolean;
        score: number;
        breakdown: ScoreBreakdown;
        streak: number;
        bestStreak: number;
        playerName: string;
        difficulty: Player["difficulty"];
        aborted?: boolean;
        abortReason?: string;
        wrongGuessCount?: number;
      }>("/api/guess", {
        method: "POST",
        body: {
          roundId: round.value.id,
          token: round.value.token,
          guess,
        },
        signal: createTimeoutSignal(15000),
      });

      streak.value = res.streak;
      bestStreak.value = res.bestStreak;
      // Pass the user-selected difficulty (e.g., "default", "hard"), not the actual tier
      // This prevents streak resets when playing "default" mode with varying random difficulties
      onStreakUpdate(res.streak, res.bestStreak, selectedDifficulty.value);

      // Track wrong guess count
      if (res.wrongGuessCount !== undefined) {
        wrongGuessCount.value = res.wrongGuessCount;
      }

      // Handle round abort (too many wrong guesses)
      if (res.aborted) {
        triggerInterference(800, "high"); // Intense effect for loss
        announceToScreenReader(
          `Round lost! Too many wrong guesses. The player was ${res.playerName}`,
          "assertive",
        );
        onAborted?.(res.playerName);
        return;
      }

      if (res.correct) {
        announceToScreenReader(
          `Correct! You guessed ${res.playerName}. Score: ${res.score}`,
          "assertive",
        );
        onCorrectGuess(
          res.playerName,
          res.difficulty,
          res.breakdown,
          res.score,
          res.streak,
        );
      } else {
        triggerInterference(400, "medium"); // Medium effect for wrong guess
        // 6th wrong guess triggers abort, so remaining = MAX_WRONG_GUESSES + 1 - count
        const remaining = 6 - (res.wrongGuessCount ?? 0);
        announceToScreenReader(
          `Incorrect guess. ${remaining} guess${remaining === 1 ? "" : "es"} remaining.`,
          "assertive",
        );
        onIncorrectGuess(res.wrongGuessCount);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit guess";
      onError(message);
      logError("useGuessSubmission", "Failed to submit guess", err);
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * Handles form submission event
   * @param {FormSubmitEvent<GuessFormOutput>} event - Form submission event
   */
  async function onSubmit(event: FormSubmitEvent<GuessFormOutput>) {
    event.preventDefault();
    if (!player.value || !round.value) return;
    const rawGuess = (event as any).data?.guess as unknown;
    const guessValue = getGuessValue(rawGuess);
    if (!guessValue) return;
    await submitGuess(guessValue);
  }

  /**
   * Alternative submission trigger via Enter key
   * @param {string} guess - Current guess value
   */
  async function submitGuessViaEnter(guess: string) {
    return onSubmit({
      preventDefault: () => {},
      data: { guess },
    } as FormSubmitEvent<GuessFormOutput>);
  }

  return {
    isSubmitting,
    wrongGuessCount,
    submitGuess,
    onSubmit,
    submitGuessViaEnter,
    getGuessValue,
  };
}
