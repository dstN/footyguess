import { describe, expect, it } from "vitest";
import {
  computeDifficulty,
  TOP5_LEAGUES,
  INTL_WEIGHTS,
  type Difficulty,
} from "~/server/utils/difficulty";

// Helper to create stats with specific appearances, goals, assists
function createStats(
  competitions: Array<{
    id: string;
    appearances: number;
    goals?: number;
    assists?: number;
  }>,
) {
  return competitions.map((c) => ({
    competition_id: c.id,
    appearances: c.appearances,
    goals: c.goals || 0,
    assists: c.assists || 0,
  }));
}

describe("computeDifficulty - v1.6.1 Strict AND Logic", () => {
  describe("base AND thresholds", () => {
    it("returns easy tier for >= 100 Intl AND >= 250 Top5", () => {
      // 80 CL apps * 1.25 = 100 weighted intl + 250 Top5
      const stats = createStats([
        { id: "CL", appearances: 80 },
        { id: "GB1", appearances: 250 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("easy");
      expect(result.multiplier).toBe(1);
    });

    it("returns medium tier for >= 80 Intl AND >= 175 Top5", () => {
      const stats = createStats([
        { id: "CL", appearances: 64 }, // 64 * 1.25 = 80
        { id: "GB1", appearances: 175 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("medium");
      expect(result.multiplier).toBe(2);
    });

    it("returns hard tier for >= 60 Intl AND >= 125 Top5", () => {
      const stats = createStats([
        { id: "CL", appearances: 48 }, // 48 * 1.25 = 60
        { id: "GB1", appearances: 125 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("hard");
      expect(result.multiplier).toBe(3);
    });

    it("returns ultra tier when not meeting AND criteria", () => {
      // High intl but low top5
      const stats = createStats([
        { id: "CL", appearances: 100 }, // 125 weighted
        { id: "GB1", appearances: 50 }, // Below all thresholds
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
      expect(result.multiplier).toBe(4);
    });

    it("returns ultra tier when only top5 is high", () => {
      // High top5 but low intl
      const stats = createStats([
        { id: "CL", appearances: 10 }, // 12.5 weighted
        { id: "GB1", appearances: 300 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
    });
  });

  describe("Exception 1 - CL Goals", () => {
    it("upgrades ultra to easy with >= 25 CL goals", () => {
      const stats = createStats([
        { id: "CL", appearances: 50, goals: 25 },
        { id: "GB1", appearances: 50 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("easy");
    });

    it("does not downgrade easy player with low goals", () => {
      const stats = createStats([
        { id: "CL", appearances: 80, goals: 0 },
        { id: "GB1", appearances: 250, goals: 0 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("easy");
    });
  });

  describe("Exception 2 - CL Goals + Assists", () => {
    it("upgrades ultra to easy with >= 20 CL G+A", () => {
      const stats = createStats([
        { id: "CL", appearances: 50, goals: 12, assists: 8 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("easy");
    });

    it("upgrades ultra to medium with 10-19 CL G+A", () => {
      const stats = createStats([
        { id: "CL", appearances: 50, goals: 8, assists: 7 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("medium");
    });

    it("upgrades ultra to hard with 5-9 CL G+A", () => {
      const stats = createStats([
        { id: "CL", appearances: 50, goals: 3, assists: 3 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("hard");
    });

    it("does not upgrade with < 5 CL G+A", () => {
      const stats = createStats([
        { id: "CL", appearances: 50, goals: 2, assists: 2 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
    });
  });

  describe("Goalkeeper exceptions", () => {
    it("uses reduced threshold (80/200) for goalkeepers", () => {
      // 70 CL * 1.25 = 87.5 weighted intl
      const stats = createStats([
        { id: "CL", appearances: 70 },
        { id: "GB1", appearances: 200 },
      ]);

      // Without GK flag - would be medium
      const normal = computeDifficulty(stats);
      expect(normal.tier).toBe("medium");

      // With GK flag - should be easy (>= 80 Intl AND >= 200 Top5)
      const gk = computeDifficulty(stats, { isGoalkeeper: true });
      expect(gk.tier).toBe("easy");
    });

    it("upgrades GK to easy with > 325 CS and > 45 Intl", () => {
      const stats = createStats([
        { id: "CL", appearances: 40 }, // 50 weighted
        { id: "GB1", appearances: 100 },
      ]);

      const result = computeDifficulty(stats, {
        isGoalkeeper: true,
        cleanSheets: 330,
      });

      expect(result.tier).toBe("easy");
    });

    it("upgrades GK to medium with > 275 CS and > 35 Intl", () => {
      const stats = createStats([
        { id: "CL", appearances: 30 }, // 37.5 weighted
      ]);

      const result = computeDifficulty(stats, {
        isGoalkeeper: true,
        cleanSheets: 280,
      });

      expect(result.tier).toBe("medium");
    });

    it("upgrades GK to hard with > 225 CS and > 25 Intl", () => {
      const stats = createStats([
        { id: "CL", appearances: 25 }, // 31.25 weighted
      ]);

      const result = computeDifficulty(stats, {
        isGoalkeeper: true,
        cleanSheets: 230,
      });

      expect(result.tier).toBe("hard");
    });
  });

  describe("forceUltra option", () => {
    it("forces ultra tier regardless of stats", () => {
      const stats = createStats([
        { id: "CL", appearances: 100 },
        { id: "GB1", appearances: 500 },
      ]);
      const result = computeDifficulty(stats, { forceUltra: true });

      expect(result.tier).toBe("ultra");
      expect(result.multiplier).toBe(4);
    });
  });

  describe("return value structure", () => {
    it("includes all required properties", () => {
      const stats = createStats([{ id: "CL", appearances: 50 }]);
      const result = computeDifficulty(stats);

      expect(result).toHaveProperty("basis");
      expect(result).toHaveProperty("totalAppearances");
      expect(result).toHaveProperty("tier");
      expect(result).toHaveProperty("multiplier");
      expect(result).toHaveProperty("basePoints");
      expect(result).toHaveProperty("cluePenalty");

      expect(result.basePoints).toBe(100);
      expect(result.cluePenalty).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("handles empty stats array", () => {
      const result = computeDifficulty([]);

      expect(result.tier).toBe("ultra");
      expect(result.multiplier).toBe(4);
      expect(result.totalAppearances).toBe(0);
    });

    it("handles zero appearances", () => {
      const stats = createStats([{ id: "CL", appearances: 0 }]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
    });

    it("handles unknown competition IDs", () => {
      const stats = createStats([{ id: "UNKNOWN", appearances: 100 }]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
    });
  });
});

describe("INTL_WEIGHTS", () => {
  it("has correct weights for major competitions", () => {
    expect(INTL_WEIGHTS["CL"]).toBe(1.25);
    expect(INTL_WEIGHTS["EL"]).toBe(1.25);
    expect(INTL_WEIGHTS["UEFA"]).toBe(0.75);
    expect(INTL_WEIGHTS["EPL"]).toBe(0.5);
    expect(INTL_WEIGHTS["UI"]).toBe(0.25);
  });
});

describe("constants", () => {
  it("exports correct league lists", () => {
    expect(TOP5_LEAGUES).toContain("GB1");
    expect(TOP5_LEAGUES).toContain("ES1");
    expect(TOP5_LEAGUES).toContain("IT1");
    expect(TOP5_LEAGUES).toContain("L1");
    expect(TOP5_LEAGUES).toContain("FR1");
  });
});
