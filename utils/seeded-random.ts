/**
 * Seeded random number generator for deterministic randomness
 * Based on simple multiplicative congruential generator
 * Same seed produces same random numbers in same order
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    // Ensure seed is positive
    this.seed = (seed % 2147483647) || 1;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Generate random integer between 0 and max-1
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Generate a numeric seed from a string
 * Same string always produces same seed
 */
export function seedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
