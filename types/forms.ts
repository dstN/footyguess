import * as v from "valibot";

/**
 * Form state for the guess submission form.
 * Contains a single field for the player name guess.
 */
export interface GuessFormState {
  /** The player name that the user is guessing */
  guess: string;
}

/**
 * Valibot validation schema for the guess form.
 * Enforces:
 * - Must be a string
 * - Must not be empty (minLength 1)
 * - Custom error message when empty
 */
export const GuessFormSchema = v.object({
  guess: v.pipe(v.string(), v.minLength(1, "Please guess a player")),
});

/**
 * Type-safe inference of GuessFormSchema for type checking.
 * Use this when you need the inferred types from the schema.
 */
export type GuessFormInput = v.InferInput<typeof GuessFormSchema>;
export type GuessFormOutput = v.InferOutput<typeof GuessFormSchema>;
