import { describe, it, expect } from "vitest";
import { SeededRandom, seedFromString } from "../utils/seeded-random";

describe("Utility Functions", () => {
  describe("SeededRandom", () => {
    it("generates same sequence with same seed", () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it("generates different sequences with different seeds", () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const val1 = rng1.next();
      const val2 = rng2.next();

      expect(val1).not.toBe(val2);
    });

    it("returns values in [0, 1) range", () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("maintains state across multiple calls", () => {
      const rng = new SeededRandom(100);
      const val1 = rng.next();
      const val2 = rng.next();

      // Different calls should produce different values
      expect(val1).not.toBe(val2);
    });

    it("produces consistent sequences for repeated instantiation", () => {
      const seed = 777;
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      for (let i = 0; i < 10; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });
  });

  describe("seedFromString", () => {
    it("generates valid seed for text input", () => {
      const seed = seedFromString("test-player-123");
      expect(typeof seed).toBe("number");
      expect(seed).toBeGreaterThan(0);
    });

    it("produces consistent results for same input", () => {
      const seed1 = seedFromString("test-player-123");
      const seed2 = seedFromString("test-player-123");

      expect(seed1).toBe(seed2);
    });

    it("produces different seeds for different strings", () => {
      const seed1 = seedFromString("player-1");
      const seed2 = seedFromString("player-2");

      expect(seed1).not.toBe(seed2);
    });

    it("handles special characters", () => {
      const seed = seedFromString("!@#$%^&*()");
      expect(typeof seed).toBe("number");
    });

    it("handles very long strings", () => {
      const longStr = "a".repeat(1000);
      const seed = seedFromString(longStr);
      expect(typeof seed).toBe("number");
    });

    it("produces valid seeds (positive integers)", () => {
      const seeds = [
        seedFromString("test1"),
        seedFromString("test2"),
        seedFromString("test3"),
      ];

      seeds.forEach((seed) => {
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThan(0);
      });
    });

    it("can seed random generator consistently", () => {
      const str = "player-harry-kane";
      const seed1 = seedFromString(str);
      const seed2 = seedFromString(str);

      const rng1 = new SeededRandom(seed1);
      const rng2 = new SeededRandom(seed2);

      // Should generate identical sequences
      for (let i = 0; i < 20; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });
  });
});
