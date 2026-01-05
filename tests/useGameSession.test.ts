import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGameSession } from "../composables/useGameSession";

describe("useGameSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("initializes with empty state", () => {
    const { sessionId, player, round, isLoading, errorMessage, isError } =
      useGameSession();

    expect(sessionId.value).toBeNull();
    expect(player.value).toBeNull();
    expect(round.value).toBeNull();
    expect(isLoading.value).toBe(false);
    expect(errorMessage.value).toBe("");
    expect(isError.value).toBe(false);
  });

  it("generates new session ID if none exists", () => {
    const { ensureSessionId, sessionId } = useGameSession();

    const id1 = ensureSessionId();
    expect(id1).toBeDefined();
    expect(id1.length).toBeGreaterThan(0);
    expect(sessionId.value).toBe(id1);
  });

  it("reuses existing session ID", () => {
    const { ensureSessionId } = useGameSession();

    const id1 = ensureSessionId();
    const id2 = ensureSessionId();

    expect(id1).toBe(id2);
  });

  it("generates UUID format session IDs", () => {
    const { ensureSessionId } = useGameSession();

    const id = ensureSessionId();
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidPattern.test(id)).toBe(true);
  });

  it("initializes with empty error state", () => {
    const { errorMessage, isError } = useGameSession();

    expect(errorMessage.value).toBe("");
    expect(isError.value).toBe(false);
  });

  it("initializes with empty player data", () => {
    const { player, round, currentName } = useGameSession();

    expect(player.value).toBeNull();
    expect(round.value).toBeNull();
    expect(currentName.value).toBeUndefined();
  });
});
