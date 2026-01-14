import { describe, expect, it } from "vitest";
import {
  calculateScore,
  getStreakBonusMultiplier,
  getTimeBonus,
} from "~/server/utils/scoring";
import type { Difficulty } from "~/server/utils/difficulty";

// Standard difficulty fixtures
const easyDifficulty: Difficulty = {
  basis: "international",
  totalAppearances: 100,
  tier: "easy",
  multiplier: 1,
  basePoints: 100,
  cluePenalty: 10,
};

const mediumDifficulty: Difficulty = {
  basis: "international",
  totalAppearances: 70,
  tier: "medium",
  multiplier: 2,
  basePoints: 100,
  cluePenalty: 10,
};

const ultraDifficulty: Difficulty = {
  basis: "international",
  totalAppearances: 30,
  tier: "ultra",
  multiplier: 4,
  basePoints: 100,
  cluePenalty: 10,
};

describe("getStreakBonusMultiplier", () => {
  it("returns 0 for streak < 5", () => {
    expect(getStreakBonusMultiplier(0)).toBe(0);
    expect(getStreakBonusMultiplier(4)).toBe(0);
  });

  it("returns correct values for streak tiers", () => {
    expect(getStreakBonusMultiplier(5)).toBe(0.05);
    expect(getStreakBonusMultiplier(15)).toBe(0.1);
    expect(getStreakBonusMultiplier(30)).toBe(0.15);
    expect(getStreakBonusMultiplier(60)).toBe(0.2);
    expect(getStreakBonusMultiplier(100)).toBe(0.3);
  });
});

describe("getTimeBonus", () => {
  it("returns 0 for undefined elapsed time", () => {
    expect(getTimeBonus(undefined)).toBe(0);
  });

  it("returns max bonus (1.2) for instant guess", () => {
    expect(getTimeBonus(0)).toBe(1.2);
    expect(getTimeBonus(1)).toBe(1.2);
  });

  it("returns 0 for 120s to 300s", () => {
    expect(getTimeBonus(120)).toBeCloseTo(0, 1);
    expect(getTimeBonus(200)).toBe(0);
    expect(getTimeBonus(300)).toBe(0);
  });

  it("returns -0.1% linear penalty per second after 5 min", () => {
    // 301s = 1s penalty = -0.1%
    expect(getTimeBonus(301)).toBeCloseTo(-0.001);
    // 360s (6 min) = 60s penalty = -6%
    expect(getTimeBonus(360)).toBeCloseTo(-0.06);
    // 390s (6.5 min) = 90s penalty = -9%
    expect(getTimeBonus(390)).toBeCloseTo(-0.09);
    // 420s (7 min) = -12%
    expect(getTimeBonus(420)).toBeCloseTo(-0.12);
    // 600s (10 min) = -30% (max)
    expect(getTimeBonus(600)).toBeCloseTo(-0.3);
    // Beyond 10 min: still capped at -30%
    expect(getTimeBonus(700)).toBeCloseTo(-0.3);
  });
});

describe("calculateScore - ALL ADDITIVE formula with 6% penalties", () => {
  describe("base scoring", () => {
    it("gives +20% bonus for perfect play (0 clues, 0 wrong guesses)", () => {
      const result = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 180,
      });
      expect(result.adjustedBase).toBe(100);
      expect(result.noClueBonus).toBe(10); // +10%
      expect(result.noMaliceBonus).toBe(10); // +10%
      expect(result.timeBonusPoints).toBe(0);
      // 100 + 10 + 10 = 120
      expect(result.finalScore).toBe(120);
    });
  });

  describe("clue penalty at 6% each", () => {
    it("gives -6% per clue", () => {
      const oneClue = calculateScore(easyDifficulty, 1, 0, {
        elapsedSeconds: 180,
      });
      const twoClues = calculateScore(easyDifficulty, 2, 0, {
        elapsedSeconds: 180,
      });
      const threeClues = calculateScore(easyDifficulty, 3, 0, {
        elapsedSeconds: 180,
      });

      // 1 clue = -6% of 100 = -6
      expect(oneClue.cluePenalty).toBe(6);
      // 2 clues = -12% of 100 = -12
      expect(twoClues.cluePenalty).toBe(12);
      // 3 clues = -18% of 100 = -18
      expect(threeClues.cluePenalty).toBe(18);
    });

    it("caps at 30% for 5+ clues", () => {
      const fiveClues = calculateScore(easyDifficulty, 5, 0, {
        elapsedSeconds: 180,
      });
      const tenClues = calculateScore(easyDifficulty, 10, 0, {
        elapsedSeconds: 180,
      });

      // 5 clues = 5 × 6% = 30% = 30
      expect(fiveClues.cluePenalty).toBe(30);
      // 10 clues = capped at 30%
      expect(tenClues.cluePenalty).toBe(30);
    });
  });

  describe("malice penalty at 6% each", () => {
    it("gives -6% per wrong guess", () => {
      const oneMiss = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 180,
        missedGuesses: 1,
      });
      const twoMiss = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 180,
        missedGuesses: 2,
      });

      expect(oneMiss.malicePenalty).toBe(6);
      expect(twoMiss.malicePenalty).toBe(12);
    });

    it("caps at 30% for 5+ wrong guesses", () => {
      const fiveMiss = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 180,
        missedGuesses: 5,
      });

      expect(fiveMiss.malicePenalty).toBe(30);
    });
  });

  describe("time penalty capped at 30%", () => {
    it("caps time penalty at -30% (at 10 min)", () => {
      const result = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 600,
      });
      expect(result.timeBonus).toBe(-0.3);
      expect(result.timeBonusPoints).toBe(-30);
      // 100 + 10 + 10 - 30 = 90
      expect(result.finalScore).toBe(90);
    });
  });

  describe("worst case (all max penalties)", () => {
    it("gives minimum 10 points on easy (100 - 30 - 30 - 30 = 10)", () => {
      const result = calculateScore(easyDifficulty, 5, 0, {
        elapsedSeconds: 600,
        missedGuesses: 5,
      });

      expect(result.cluePenalty).toBe(30); // 5 × 6% = 30%
      expect(result.malicePenalty).toBe(30); // 5 × 6% = 30%
      expect(result.timeBonusPoints).toBe(-30); // capped

      // 100 + 0 - 30 - 30 - 30 = 10
      expect(result.finalScore).toBe(10);
    });

    it("gives minimum 40 points on ultra with worst case", () => {
      const result = calculateScore(ultraDifficulty, 5, 0, {
        elapsedSeconds: 600,
        missedGuesses: 5,
      });

      // 400 - 120 (30%) - 120 (30%) - 120 (30%) = 40
      expect(result.cluePenalty).toBe(120);
      expect(result.malicePenalty).toBe(120);
      expect(result.timeBonusPoints).toBe(-120);
      expect(result.finalScore).toBe(40);
    });
  });

  describe("min/max score verification", () => {
    // Max = adjustedBase × 2.7 (100% + 30% streak + 120% time + 10% no-clue + 10% no-malice)
    // Min = adjustedBase × 0.1 (100% - 30% clues - 30% malice - 30% time)

    it("Easy: min 10, max 270", () => {
      const max = calculateScore(easyDifficulty, 0, 100, {
        elapsedSeconds: 0,
        missedGuesses: 0,
      });
      const min = calculateScore(easyDifficulty, 5, 0, {
        elapsedSeconds: 600,
        missedGuesses: 5,
      });

      expect(max.finalScore).toBe(270);
      expect(min.finalScore).toBe(10);
    });

    it("Medium: min 20, max 540", () => {
      const max = calculateScore(mediumDifficulty, 0, 100, {
        elapsedSeconds: 0,
        missedGuesses: 0,
      });
      const min = calculateScore(mediumDifficulty, 5, 0, {
        elapsedSeconds: 600,
        missedGuesses: 5,
      });

      expect(max.finalScore).toBe(540);
      expect(min.finalScore).toBe(20);
    });

    it("Ultra: min 40, max 1080", () => {
      const max = calculateScore(ultraDifficulty, 0, 100, {
        elapsedSeconds: 0,
        missedGuesses: 0,
      });
      const min = calculateScore(ultraDifficulty, 5, 0, {
        elapsedSeconds: 600,
        missedGuesses: 5,
      });

      expect(max.finalScore).toBe(1080);
      expect(min.finalScore).toBe(40);
    });
  });

  describe("grace period (time freeze)", () => {
    it("subtracts grace seconds from elapsed time", () => {
      const result = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 30,
        graceSeconds: 30,
      });
      // Effective elapsed = 0, so max bonus
      expect(result.timeBonus).toBeCloseTo(1.2);
    });
  });
});
