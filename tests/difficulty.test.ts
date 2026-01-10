import { describe, expect, it } from "vitest";
import {
  computeDifficulty,
  TOP5_LEAGUES,
  INTL_COMPS,
  INTL_WEIGHTS,
  INTL_HARD_THRESHOLD,
  TOP5_HARD_THRESHOLD,
  TOP5_EASY_MIN,
  TOP5_MEDIUM_MIN,
  type Difficulty,
} from "~/server/utils/difficulty";

// Helper to create stats with specific appearances
function createStats(competitions: Array<{ id: string; appearances: number }>) {
  return competitions.map((c) => ({
    competition_id: c.id,
    appearances: c.appearances,
  }));
}

describe("computeDifficulty", () => {
  describe("international basis", () => {
    it("returns easy tier for >80 weighted international apps", () => {
      // 100 CL apps * 1.25 weight = 125 weighted apps
      // Also need 100+ top5 apps to avoid downgrade
      const stats = createStats([
        { id: "CL", appearances: 100 },
        { id: "GB1", appearances: 100 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("easy");
      expect(result.multiplier).toBe(1);
      expect(result.basis).toBe("international");
    });

    it("returns medium tier for 60-80 weighted international apps", () => {
      // 60 CL apps * 1.25 = 75 weighted apps (above 60, below 80)
      // Also need 50+ top5 apps to avoid medium->hard downgrade
      const stats = createStats([
        { id: "CL", appearances: 60 },
        { id: "GB1", appearances: 60 },
      ]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("medium");
      expect(result.multiplier).toBe(1.25);
    });

    it("returns hard tier for 45-60 weighted international apps", () => {
      // 40 CL apps * 1.25 = 50 weighted apps
      const stats = createStats([{ id: "CL", appearances: 40 }]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("hard");
      expect(result.multiplier).toBe(1.5);
    });

    it("returns ultra tier for <45 weighted international apps", () => {
      // 20 CL apps * 1.25 = 25 weighted apps
      const stats = createStats([{ id: "CL", appearances: 20 }]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
      expect(result.multiplier).toBe(2);
    });
  });

  describe("top 5 leagues basis", () => {
    it("returns medium tier for >400 top 5 league apps (with downgrade)", () => {
      // 450 Premier League apps but no international -> downgraded twice
      const stats = createStats([{ id: "GB1", appearances: 450 }]);
      const result = computeDifficulty(stats);

      // Downgraded: easy->medium (intl<50), then medium->hard (intl<35)
      expect(result.tier).toBe("hard");
      expect(result.basis).toBe("top5");
    });

    it("returns medium tier for 200-400 top 5 league apps", () => {
      // 250 La Liga apps
      const stats = createStats([{ id: "ES1", appearances: 250 }]);
      const result = computeDifficulty(stats);

      // Will be downgraded to hard because intlApps < 35
      expect(result.tier).toBe("hard");
      expect(result.basis).toBe("top5");
    });

    it("returns hard tier for 100-200 top 5 league apps", () => {
      const stats = createStats([{ id: "L1", appearances: 150 }]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("hard");
      expect(result.multiplier).toBe(1.5);
    });

    it("returns ultra tier for <100 top 5 league apps", () => {
      const stats = createStats([{ id: "FR1", appearances: 50 }]);
      const result = computeDifficulty(stats);

      expect(result.tier).toBe("ultra");
      expect(result.multiplier).toBe(2);
    });
  });

  describe("downgrade rules", () => {
    it("downgrades top5 easy to medium when intl apps < 50", () => {
      // Player with lots of league apps but minimal European experience
      const stats = createStats([
        { id: "GB1", appearances: 500 }, // Easy by top5
        { id: "CL", appearances: 30 }, // 37.5 weighted intl < 50
      ]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("top5");
      expect(result.tier).toBe("medium");
    });

    it("downgrades top5 medium to hard when intl apps < 35", () => {
      // Player with decent league apps but very little European experience
      const stats = createStats([
        { id: "IT1", appearances: 300 }, // Medium by top5
        { id: "CL", appearances: 10 }, // 12.5 weighted intl < 35
      ]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("top5");
      expect(result.tier).toBe("hard");
    });

    it("downgrades international easy to medium when top5 apps < 100", () => {
      // Player with lots of international apps but minimal top5 experience
      const stats = createStats([
        { id: "CL", appearances: 80 }, // 100 weighted intl -> easy
        { id: "GB1", appearances: 50 }, // 50 top5 < 100
      ]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("international");
      expect(result.tier).toBe("medium");
    });

    it("downgrades international medium to hard when top5 apps < 50", () => {
      // Player with moderate international apps but very minimal top5 experience
      const stats = createStats([
        { id: "CL", appearances: 55 }, // 68.75 weighted intl -> medium
        { id: "GB1", appearances: 30 }, // 30 top5 < 50
      ]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("international");
      expect(result.tier).toBe("hard");
    });
  });

  describe("basis selection", () => {
    it("prefers international basis when tier is not ultra", () => {
      const stats = createStats([
        { id: "CL", appearances: 60 }, // Medium by international
        { id: "GB1", appearances: 300 }, // Medium by top5
      ]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("international");
    });

    it("falls back to top5 when international would be ultra", () => {
      const stats = createStats([
        { id: "CL", appearances: 10 }, // Ultra by international
        { id: "GB1", appearances: 300 }, // Medium by top5
      ]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("top5");
    });

    it("uses international if no top5 stats available", () => {
      const stats = createStats([{ id: "CL", appearances: 20 }]);
      const result = computeDifficulty(stats);

      expect(result.basis).toBe("international");
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
      expect(result.multiplier).toBe(2);
    });

    it("prevents downgrade rules from applying", () => {
      const stats = createStats([{ id: "GB1", appearances: 500 }]);
      const normal = computeDifficulty(stats);
      const forced = computeDifficulty(stats, { forceUltra: true });

      // Without intl apps, gets double-downgraded: easy->medium (intl<50), medium->hard (intl<35)
      expect(normal.tier).toBe("hard");
      expect(forced.tier).toBe("ultra"); // Forced
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
      expect(result.multiplier).toBe(2);
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
  it("exports correct threshold constants", () => {
    expect(INTL_HARD_THRESHOLD).toBe(45);
    expect(TOP5_HARD_THRESHOLD).toBe(100);
    expect(TOP5_EASY_MIN).toBe(100);
    expect(TOP5_MEDIUM_MIN).toBe(50);
  });

  it("exports correct league lists", () => {
    expect(TOP5_LEAGUES).toContain("GB1");
    expect(TOP5_LEAGUES).toContain("ES1");
    expect(TOP5_LEAGUES).toContain("IT1");
    expect(TOP5_LEAGUES).toContain("L1");
    expect(TOP5_LEAGUES).toContain("FR1");
  });
});
