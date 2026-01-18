import { describe, it, expect } from "vitest";
import { computeDifficulty } from "../server/utils/difficulty";

// Helper to create mock stats
const makeStats = (
  intlApps: number,
  top5Apps: number,
  intlGoals = 0,
  clGoalsAndAssists = 0,
) => [
  {
    competition_id: "CL",
    appearances: intlApps,
    goals: 0,
    assists: clGoalsAndAssists,
  }, // CL counts as Int'l (weight 1.25) + CL for exceptions
  { competition_id: "GB1", appearances: top5Apps, goals: 0, assists: 0 },
  {
    competition_id: "INTL_GOALS_DUMMY",
    appearances: 0,
    goals: intlGoals,
    assists: 0,
  }, // For intlGoals
];

// Note: CL weight is 1.25. So 80 CL apps = 100 weighted intl apps.
// Easy Thresholds: >= 100 Weighted Intl AND >= 250 Top5

describe("Difficulty Logic Upgrades", () => {
  it("should classify high apps player as Easy", () => {
    // 100 weighted intl (80*1.25) AND 250 top5
    const stats = makeStats(80, 250);
    const result = computeDifficulty(stats as any);
    expect(result.tier).toBe("easy");
  });

  it("should NOT downgrade an Easy player who has low goals", () => {
    // Already Easy via apps (80 CL * 1.25 = 100, 250 Top5)
    // Has 0 CL goals/assists (which normally would be Ultra/Hard bucket if checked alone)
    const stats = makeStats(80, 250, 0, 0);
    const result = computeDifficulty(stats as any);
    expect(result.tier).toBe("easy");
  });

  it("should upgrade Ultra player to Easy via CL Goals exception", () => {
    // 0 apps (Ultra) but 25 CL G+A (Easy Upgrade)
    const stats = makeStats(0, 0, 0, 25);
    const result = computeDifficulty(stats as any);
    expect(result.tier).toBe("easy");
  });

  it("should upgrade Ultra player to Medium via CL Goals exception", () => {
    // 0 apps (Ultra) but 15 CL G+A (Medium Upgrade)
    const stats = makeStats(0, 0, 0, 15);
    const result = computeDifficulty(stats as any);
    expect(result.tier).toBe("medium");
  });

  it("should upgrade Ultra player to Hard via CL Goals exception", () => {
    // 0 apps (Ultra) but 7 CL G+A (Hard Upgrade)
    const stats = makeStats(0, 0, 0, 7);
    const result = computeDifficulty(stats as any);
    expect(result.tier).toBe("hard");
  });

  it("should NOT downgrade Medium player (via apps) who qualifies for Hard (via goals)", () => {
    // Medium criteria: >= 80 Intl (64 CL * 1.25 = 80) AND >= 175 Top5
    // 7 CL G+A (which logic says 'upgrade Ultra to Hard')
    // Should stay Medium (better than Hard)
    const stats = makeStats(64, 175, 0, 7);
    const result = computeDifficulty(stats as any);
    expect(result.tier).toBe("medium");
  });

  it("should classify GK with ~99 Intl apps as Easy (Alisson Rule)", () => {
    // 99 Weighted Intl Apps (below 100 threshold)
    // 250 Top5 Apps
    // Without GK flag -> Medium
    // With GK flag -> Easy (Threshold drops to 80/200)
    const stats = makeStats(79, 250); // 79 * 1.25 = 98.75 ~ 98 (actually int(79*1.25) depends).
    // Let's use 80 * 1.25 = 100. Let's use 70 * 1.25 = 87.5.
    // 70 CL apps = 87.5 weighted intl.
    // Standard threshold: 100. GK threshold: 80.
    const gkStats = makeStats(70, 250);

    // Check normal
    const normalResult = computeDifficulty(gkStats as any);
    expect(normalResult.tier).toBe("medium"); // 87.5 >= 80 (Medium), < 100 (Easy)

    // Check GK
    const gkResult = computeDifficulty(gkStats as any, { isGoalkeeper: true });
    expect(gkResult.tier).toBe("easy"); // 87.5 >= 80 (Easy for GK)
  });
});
