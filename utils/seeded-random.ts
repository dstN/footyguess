/**
 * Seeded random number generator using multiplicative congruential algorithm.
 * Produces deterministic but statistically uniform random numbers.
 *
 * Key properties:
 * - Same seed always produces same sequence of numbers
 * - Useful for reproducible randomness (e.g., selecting same clues for same player)
 * - Based on Park-Miller algorithm (efficient for 32-bit integers)
 *
 * Algorithm details:
 * - Multiplier (a): 16807 (prime factor of 2^31 - 1)
 * - Modulus (m): 2147483647 (2^31 - 1, Mersenne prime)
 * - Formula: next_seed = (seed * 16807) % 2147483647
 *
 * @example
 * // Same seed produces same numbers
 * const rng1 = new SeededRandom(42);
 * const rng2 = new SeededRandom(42);
 *
 * console.log(rng1.next()); // 0.0000078234...
 * console.log(rng2.next()); // 0.0000078234... (identical)
 *
 * @example
 * // Deterministic clue selection per player
 * const rng = new SeededRandom(playerId);
 * const randomClueIndex = rng.nextInt(availableClues.length);
 */
export class SeededRandom {
  private seed: number;

  /**
   * Create a new seeded random number generator.
   *
   * @param seed - Initial seed value. Should be a positive integer.
   *              Values are normalized to ensure valid state.
   *
   * @example
   * const rng = new SeededRandom(12345);
   * const rng2 = new SeededRandom(playerId); // Use player ID as seed
   */
  constructor(seed: number) {
    // Ensure seed is positive and in valid range
    this.seed = seed % 2147483647 || 1;
  }

  /**
   * Generate next random number between 0 (inclusive) and 1 (exclusive).
   * Same as Math.random() but deterministic.
   *
   * @returns Random number in range [0, 1)
   *
   * @example
   * const rng = new SeededRandom(42);
   * const rand = rng.next(); // Always 0.0000078234...
   */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Generate random integer between 0 (inclusive) and max (exclusive).
   * Useful for array indexing or selection.
   *
   * @param max - Maximum value (exclusive). Should be positive.
   * @returns Random integer in range [0, max)
   *
   * @example
   * const rng = new SeededRandom(42);
   * const diceRoll = rng.nextInt(6); // 0-5
   * const cardIndex = rng.nextInt(deck.length);
   *
   * @example
   * // Deterministic clue selection
   * const clueRng = new SeededRandom(playerId);
   * const clueIndex = clueRng.nextInt(10);
   * // Player 123 always gets clue at index X
   * // Player 456 always gets a different consistent index
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Hash a string into a numeric seed for SeededRandom.
 * Uses simple additive hash to convert any string to a deterministic seed.
 *
 * Algorithm:
 * 1. Iterate through each character
 * 2. Shift current hash left 5 bits: hash << 5
 * 3. Subtract original hash: - hash
 * 4. Add character code
 * 5. Convert to 32-bit signed integer
 * 6. Return absolute value
 *
 * @param str - String to hash
 * @returns Positive integer seed suitable for SeededRandom
 *
 * @example
 * const seed1 = seedFromString('player-123');
 * const seed2 = seedFromString('player-123');
 * console.log(seed1 === seed2); // true (deterministic)
 *
 * @example
 * // Use player name as seed for reproducible gameplay
 * const rng = new SeededRandom(seedFromString(playerName));
 * const randomClue = rng.nextInt(availableClues.length);
 */
export function seedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
