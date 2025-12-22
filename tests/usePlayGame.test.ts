import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { usePlayGame } from "~/composables/usePlayGame";
import { routerPushMock, toastAddMock } from "./setup";

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
};

describe("usePlayGame", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(samplePlayer);
    vi.stubGlobal("$fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a player and accepts a correct guess", async () => {
    const { loadPlayer, formState, onSubmit, isError } = usePlayGame();
    await loadPlayer();

    formState.guess = samplePlayer.name;
    onSubmit({
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

    formState.guess = "Wrong Name";
    onSubmit({
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
    onSubmit({ preventDefault: () => {}, data: { guess: samplePlayer.name } } as any);
    expect(streak.value).toBe(1);
    expect(bestStreak.value).toBe(1);

    formState.guess = "Wrong Name";
    onSubmit({ preventDefault: () => {}, data: { guess: "Wrong Name" } } as any);
    expect(streak.value).toBe(0);
    expect(bestStreak.value).toBe(1);
  });
});
