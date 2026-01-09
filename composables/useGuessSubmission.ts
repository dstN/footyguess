import { ref, computed } from "vue";
import { logError } from "~/utils/client-logger";
import { createTimeoutSignal } from "~/utils/fetch";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Player } from "~/types/player";
import type { GuessFormOutput } from "~/types/forms";
import type { ScoreBreakdown } from "~/server/utils/scoring";

interface RoundState {
  id: string;
  token: string;
  sessionId: string;
  expiresAt: number;
  cluesUsed: number;
}

/**
 * Manages guess submission and validation
 * Handles API communication for guess submissions
 *
 * @example
 * ```ts
 * const { submitGuess, submitGuessViaEnter, clearGuess } = useGuessSubmission(player, round, streak);
 * await submitGuess("Harry Kane");
 * ```
 */
export function useGuessSubmission(
  player: Ref<Player | null>,
  round: Ref<RoundState | null>,
  streak: Ref<number>,
  bestStreak: Ref<number>,
  onStreakUpdate: (streak: number, bestStreak: number) => void,
  onCorrectGuess: (
    playerName: string,
    difficulty: Player["difficulty"],
    breakdown: ScoreBreakdown,
    score: number,
    newStreak: number,
  ) => void,
  onIncorrectGuess: () => void,
  onError: (message: string) => void,
) {
  const isSubmitting = ref(false);

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
      onStreakUpdate(res.streak, res.bestStreak);

      if (res.correct) {
        onCorrectGuess(
          res.playerName,
          res.difficulty,
          res.breakdown,
          res.score,
          res.streak,
        );
      } else {
        onIncorrectGuess();
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
  function submitGuessViaEnter(guess: string) {
    onSubmit({
      preventDefault: () => {},
      data: { guess },
    } as FormSubmitEvent<GuessFormOutput>);
  }

  return {
    isSubmitting,
    submitGuess,
    onSubmit,
    submitGuessViaEnter,
    getGuessValue,
  };
}
