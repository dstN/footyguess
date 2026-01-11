import { describe, expect, it } from "vitest";
import {
  calculateScore,
  getStreakBonusMultiplier,
  getTimeBonus,
  type ScoreBreakdown,
} from "~/server/utils/scoring";
import type { Difficulty } from "~/server/utils/difficulty";

// Standard difficulty fixtures (v1.3.0 multipliers: 1, 2, 3, 4)
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

const hardDifficulty: Difficulty = {
  basis: "international",
  totalAppearances: 50,
  tier: "hard",
  multiplier: 3,
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
    expect(getStreakBonusMultiplier(1)).toBe(0);
    expect(getStreakBonusMultiplier(4)).toBe(0);
  });

  it("returns 0.05 for streak 5-14", () => {
    expect(getStreakBonusMultiplier(5)).toBe(0.05);
    expect(getStreakBonusMultiplier(10)).toBe(0.05);
    expect(getStreakBonusMultiplier(14)).toBe(0.05);
  });

  it("returns 0.1 for streak 15-29", () => {
    expect(getStreakBonusMultiplier(15)).toBe(0.1);
    expect(getStreakBonusMultiplier(20)).toBe(0.1);
    expect(getStreakBonusMultiplier(29)).toBe(0.1);
  });

  it("returns 0.15 for streak 30-59", () => {
    expect(getStreakBonusMultiplier(30)).toBe(0.15);
    expect(getStreakBonusMultiplier(45)).toBe(0.15);
    expect(getStreakBonusMultiplier(59)).toBe(0.15);
  });

  it("returns 0.2 for streak 60-99", () => {
    expect(getStreakBonusMultiplier(60)).toBe(0.2);
    expect(getStreakBonusMultiplier(75)).toBe(0.2);
    expect(getStreakBonusMultiplier(99)).toBe(0.2);
  });

  it("returns 0.3 for streak 100+", () => {
    expect(getStreakBonusMultiplier(100)).toBe(0.3);
    expect(getStreakBonusMultiplier(500)).toBe(0.3);
  });
});

describe("getTimeBonus", () => {
  it("returns 0 for undefined elapsed time", () => {
    expect(getTimeBonus(undefined)).toBe(0);
  });

  it("returns max bonus (1.2) for instant guess (<=1s)", () => {
    expect(getTimeBonus(0)).toBe(1.2);
    expect(getTimeBonus(1)).toBe(1.2);
  });

  it("returns linear drop from 1s to 120s", () => {
    // At 60s (midpoint), should be ~0.6
    const bonus60 = getTimeBonus(60);
    expect(bonus60).toBeCloseTo(0.607, 1);

    // At 120s, should be 0
    const bonus120 = getTimeBonus(120);
    expect(bonus120).toBeCloseTo(0, 1);
  });

  it("returns 0 for 120s to 300s (5 min)", () => {
    expect(getTimeBonus(120)).toBeCloseTo(0, 1);
    expect(getTimeBonus(200)).toBe(0);
    expect(getTimeBonus(300)).toBe(0);
  });

  it("returns penalty for >5 min", () => {
    // After 5 min: start penalty, -10% * (floor(secondsAfter5min/30) + 1)
    // At 301s: step = floor(1/30)+1 = 1, penalty = -0.1
    expect(getTimeBonus(301)).toBe(-0.1);
    // At 330s: step = floor(30/30)+1 = 2, penalty = -0.2
    expect(getTimeBonus(330)).toBe(-0.2);
    // At 450s: step = floor(150/30)+1 = 6, penalty = -0.6 -> capped at -0.5
    expect(getTimeBonus(450)).toBe(-0.5);
    expect(getTimeBonus(600)).toBe(-0.5); // still capped
  });
});

describe("calculateScore", () => {
  describe("base scoring", () => {
    it("returns 100 for easy player with no clues, no streak, no time", () => {
      const result = calculateScore(easyDifficulty, 0, 0);
      expect(result.base).toBe(100);
      expect(result.multiplier).toBe(1.0);
      expect(result.preStreak).toBe(100);
      expect(result.finalScore).toBe(100);
    });

    it("applies difficulty multiplier correctly", () => {
      const easy = calculateScore(easyDifficulty, 0, 0);
      const medium = calculateScore(mediumDifficulty, 0, 0);
      const hard = calculateScore(hardDifficulty, 0, 0);
      const ultra = calculateScore(ultraDifficulty, 0, 0);

      expect(easy.preStreak).toBe(100); // 100 * 1.0 = 100
      expect(medium.preStreak).toBe(200); // 100 * 2.0 = 200
      expect(hard.preStreak).toBe(300); // 100 * 3.0 = 300
      expect(ultra.preStreak).toBe(400); // 100 * 4.0 = 400
    });
  });

  describe("clue penalties", () => {
    it("deducts 10 points per clue", () => {
      const noClues = calculateScore(easyDifficulty, 0, 0);
      const oneClue = calculateScore(easyDifficulty, 1, 0);
      const threeClues = calculateScore(easyDifficulty, 3, 0);

      expect(noClues.preStreak).toBe(100);
      expect(oneClue.preStreak).toBe(90);
      expect(threeClues.preStreak).toBe(70);
    });

    it("never goes below floor (10 by default)", () => {
      const manyClues = calculateScore(easyDifficulty, 15, 0);
      expect(manyClues.preStreak).toBe(10); // Floor
    });

    it("respects custom floor", () => {
      const result = calculateScore(easyDifficulty, 15, 0, { floor: 20 });
      expect(result.preStreak).toBe(20);
    });
  });

  describe("time bonus", () => {
    it("gives max bonus for instant guess", () => {
      const result = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 0,
      });
      expect(result.timeMultiplier).toBeCloseTo(2.2, 1); // 1 + 1.2
      expect(result.timeScore).toBe(220); // 100 * 2.2
    });

    it("gives no bonus/penalty for 3 min guess", () => {
      const result = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 180,
      });
      expect(result.timeMultiplier).toBe(1); // no bonus
      expect(result.timeScore).toBe(100);
    });

    it("gives penalty for slow guess (7 min)", () => {
      const result = calculateScore(easyDifficulty, 0, 0, {
        elapsedSeconds: 420,
      });
      expect(result.timeMultiplier).toBeLessThan(1);
    });
  });

  describe("streak bonus", () => {
    it("applies streak bonus correctly", () => {
      const noStreak = calculateScore(easyDifficulty, 0, 0);
      const streak10 = calculateScore(easyDifficulty, 0, 10);
      const streak100 = calculateScore(easyDifficulty, 0, 100);

      expect(noStreak.streakBonus).toBe(0);
      expect(streak10.streakBonus).toBe(0.05);
      expect(streak100.streakBonus).toBe(0.3);

      // Final score should reflect streak bonus
      expect(streak10.finalScore).toBe(105); // 100 * 1.05
      expect(streak100.finalScore).toBe(130); // 100 * 1.30
    });
  });

  describe("malice penalty", () => {
    it("deducts 10% per missed guess (v1.4.0)", () => {
      const noMiss = calculateScore(easyDifficulty, 0, 0, { missedGuesses: 0 });
      const oneMiss = calculateScore(easyDifficulty, 0, 0, {
        missedGuesses: 1,
      });
      const fiveMiss = calculateScore(easyDifficulty, 0, 0, {
        missedGuesses: 5,
      });

      expect(noMiss.malicePenalty).toBeCloseTo(0);
      expect(oneMiss.malicePenalty).toBe(-0.1); // v1.4.0: -10% per guess
      expect(fiveMiss.malicePenalty).toBe(-0.5); // 5 * -10% = -50%
    });

    it("caps malice penalty at -50%", () => {
      const manyMiss = calculateScore(easyDifficulty, 0, 0, {
        missedGuesses: 50,
      });
      expect(manyMiss.malicePenalty).toBe(-0.5);
      expect(manyMiss.finalScore).toBe(50); // 100 * 0.5
    });
  });

  describe("combined formula", () => {
    it("correctly combines all factors", () => {
      // Medium difficulty (v1.3.0: 2x), 2 clues, streak of 10, 60s guess, 1 miss
      const result = calculateScore(mediumDifficulty, 2, 10, {
        elapsedSeconds: 60,
        missedGuesses: 1,
      });

      // Base: 100 * 2 = 200 (v1.3.0: medium = 2x)
      // After clues: 200 - 20 = 180
      // Time bonus at 60s: ~0.607, so multiplier ~1.607
      // timeScore: ~289
      // Streak: 10 -> +5%
      // Malice: 1 miss -> -10% (v1.4.0)

      expect(result.base).toBe(100);
      expect(result.multiplier).toBe(2); // v1.3.0: medium = 2x
      expect(result.preStreak).toBe(180); // 100*2 - 2*10
      expect(result.cluesUsed).toBe(2);
      expect(result.streakBonus).toBe(0.05);
      expect(result.malicePenalty).toBe(-0.1); // v1.4.0: -10% per guess
      expect(result.finalScore).toBeGreaterThan(100);
    });

    it("returns valid breakdown structure", () => {
      const result = calculateScore(easyDifficulty, 0, 0);

      expect(result).toHaveProperty("base");
      expect(result).toHaveProperty("multiplier");
      expect(result).toHaveProperty("timeMultiplier");
      expect(result).toHaveProperty("cluesUsed");
      expect(result).toHaveProperty("cluePenalty");
      expect(result).toHaveProperty("preStreak");
      expect(result).toHaveProperty("timeScore");
      expect(result).toHaveProperty("streakBonus");
      expect(result).toHaveProperty("finalScore");
      expect(result).toHaveProperty("malicePenalty");
    });
  });
});
