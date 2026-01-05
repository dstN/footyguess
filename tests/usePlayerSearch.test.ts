import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { usePlayerSearch } from "~/composables/usePlayerSearch";

describe("usePlayerSearch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("$fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("debounces and fetches suggestions for 2+ chars", async () => {
    fetchMock.mockResolvedValue(["Ronaldo"]);
    const { searchTerm, suggestions, onSearch } = usePlayerSearch();

    onSearch("Ro");
    await vi.runAllTimersAsync();

    // Check that $fetch was called with correct URL (signal is second arg)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/searchPlayers?q=Ro&limit=10",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await Promise.resolve();
    expect(searchTerm.value).toBe("Ro");
    expect(suggestions.value).toEqual(["Ronaldo"]);
  });

  it("clears suggestions for short queries", async () => {
    fetchMock.mockResolvedValue(["Messi"]);
    const { suggestions, onSearch } = usePlayerSearch();

    onSearch("M");
    await vi.runAllTimersAsync();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(suggestions.value).toEqual([]);
  });
});
