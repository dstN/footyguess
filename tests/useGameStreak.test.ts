import { describe, it, expect, beforeEach } from "vitest";
import { useGameStreak } from "../composables/useGameStreak";

describe("useGameStreak", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with zero streak values", () => {
    const { streak, bestStreak } = useGameStreak();

    expect(streak.value).toBe(0);
    expect(bestStreak.value).toBe(0);
  });

  it("updates streak values", () => {
    const { streak, bestStreak, updateStreak } = useGameStreak();

    updateStreak(8, 15);

    expect(streak.value).toBe(8);
    expect(bestStreak.value).toBe(15);
  });

  it("resets current streak to 0", () => {
    const { streak, bestStreak, resetStreak, updateStreak } = useGameStreak();

    updateStreak(5, 10);
    resetStreak();

    expect(streak.value).toBe(0);
  });

  it("preserves best streak when resetting current streak", () => {
    const { streak, bestStreak, resetStreak, updateStreak } = useGameStreak();

    updateStreak(5, 10);
    resetStreak();

    expect(bestStreak.value).toBe(10);
  });

  it("handles large streak values", () => {
    const { streak, bestStreak, updateStreak } = useGameStreak();

    updateStreak(999, 1000);

    expect(streak.value).toBe(999);
    expect(bestStreak.value).toBe(1000);
  });

  it("handles zero values correctly", () => {
    const { streak, bestStreak, updateStreak } = useGameStreak();

    updateStreak(0, 0);

    expect(streak.value).toBe(0);
    expect(bestStreak.value).toBe(0);
  });

  it("can track increasing streaks", () => {
    const { streak, updateStreak } = useGameStreak();

    updateStreak(1, 1);
    expect(streak.value).toBe(1);

    updateStreak(2, 2);
    expect(streak.value).toBe(2);

    updateStreak(5, 5);
    expect(streak.value).toBe(5);
  });

  it("supports independent streak and best streak values", () => {
    const { streak, bestStreak, updateStreak } = useGameStreak();

    updateStreak(3, 20);

    expect(streak.value).toBe(3);
    expect(bestStreak.value).toBe(20);
  });
});
