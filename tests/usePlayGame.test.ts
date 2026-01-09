import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { usePlayGame } from "~/composables/usePlayGame";
import { routerPushMock, toastAddMock } from "./setup";

// Mock standard utils
vi.mock("~/utils/client-logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock("~/utils/accessibility", () => ({
  announceToScreenReader: vi.fn(),
}));

vi.mock("~/utils/fetch", () => ({
  createTimeoutSignal: () => new AbortController().signal,
}));

const samplePlayer = {
  name: "Toni Kroos",
  active: 1,
  birthdate: "1990-01-04",
  nationalities: ["Germany"],
  foot: "right",
  height_cm: 183,
  main_position: "CM",
  secondary_positions: ["DM"],
  birthplace: "Greifswald",
  total_stats: { appearances: 100, goals: 10, assists: 20 },
  stats: [],
  transfers: [
    {
      season: "14/15",
      transfer_date: "2014-07-16",
      fee: "25000000",
      from_club: "Bayern Munich",
      to_club: "Real Madrid",
    },
  ],
  difficulty: {
    basis: "international",
    totalAppearances: 100,
    tier: "easy",
    multiplier: 1,
    basePoints: 100,
    cluePenalty: 10,
  },
  round: {
    id: "round-1",
    token: "token",
    sessionId: "session-1",
    expiresAt: Date.now() + 600_000,
    cluesUsed: 0,
  },
  last_scraped_at: Date.now(),
};

const guessBreakdown = {
  base: 100,
  multiplier: 1,
  timeMultiplier: 1,
  cluesUsed: 0,
  cluePenalty: 10,
  preStreak: 100,
  timeScore: 100,
  streakBonus: 0,
  finalScore: 100,
};

describe("usePlayGame", () => {
  const fetchMock = vi.fn();
  let guessResponse: any;

  beforeEach(() => {
    fetchMock.mockReset();
    guessResponse = {
      correct: true,
      score: 100,
      breakdown: guessBreakdown,
      streak: 1,
      bestStreak: 1,
      playerName: samplePlayer.name,
      difficulty: samplePlayer.difficulty,
    };
    fetchMock.mockImplementation((url: any) => {
      if (typeof url === "string" && url.startsWith("/api/guess")) {
        return Promise.resolve(guessResponse);
      }
      return Promise.resolve(samplePlayer);
    });
    vi.stubGlobal("$fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a player and accepts a correct guess", async () => {
    const { loadPlayer, formState, onSubmit, isError } = usePlayGame();
    await loadPlayer();

    formState.guess = samplePlayer.name;
    await onSubmit({
      preventDefault: () => {},
      data: { guess: samplePlayer.name },
    } as any);

    expect(routerPushMock).toHaveBeenCalledWith("/won");
    expect(isError.value).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("marks incorrect guess and shows toast", async () => {
    const { loadPlayer, formState, onSubmit, isError } = usePlayGame();
    await loadPlayer();

    guessResponse = {
      correct: false,
      score: 0,
      breakdown: guessBreakdown,
      streak: 0,
      bestStreak: 1,
      playerName: samplePlayer.name,
      difficulty: samplePlayer.difficulty,
    };

    formState.guess = "Wrong Name";
    await onSubmit({
      preventDefault: () => {},
      data: { guess: "Wrong Name" },
    } as any);

    expect(isError.value).toBe(true);
    expect(toastAddMock).toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("increments streak on correct guess and resets on miss", async () => {
    const { loadPlayer, formState, onSubmit, streak, bestStreak } =
      usePlayGame();
    await loadPlayer();

    formState.guess = samplePlayer.name;
    await onSubmit({
      preventDefault: () => {},
      data: { guess: samplePlayer.name },
    } as any);
    expect(streak.value).toBe(1);
    expect(bestStreak.value).toBe(1);

    guessResponse = {
      correct: false,
      score: 0,
      breakdown: guessBreakdown,
      streak: 0,
      bestStreak: 1,
      playerName: samplePlayer.name,
      difficulty: samplePlayer.difficulty,
    };

    formState.guess = "Wrong Name";
    await onSubmit({
      preventDefault: () => {},
      data: { guess: "Wrong Name" },
    } as any);
    expect(streak.value).toBe(0);
    expect(bestStreak.value).toBe(1);
  });
});
