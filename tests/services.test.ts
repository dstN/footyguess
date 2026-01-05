/**
 * Tests for service layer modules
 */

import { describe, it, expect, beforeEach } from "vitest";
import { isCorrectGuess, hasBeenScored } from "~/server/services/guess";
import {
  hasReachedClueLimit,
  useClue as testUseClue,
} from "~/server/services/clue";
import { isRoundExpired, validateRoundOwnership } from "~/server/services/round";

describe("Guess Service", () => {
  it("should correctly identify exact match guesses", () => {
    expect(isCorrectGuess("Cristiano Ronaldo", "Cristiano Ronaldo")).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(isCorrectGuess("cristiano ronaldo", "CRISTIANO RONALDO")).toBe(true);
  });

  it("should handle whitespace trimming", () => {
    expect(isCorrectGuess("  Cristiano Ronaldo  ", "Cristiano Ronaldo")).toBe(
      true,
    );
  });

  it("should reject incorrect guesses", () => {
    expect(isCorrectGuess("Messi", "Ronaldo")).toBe(false);
  });

  it("should reject partial matches", () => {
    expect(isCorrectGuess("Cristiano", "Cristiano Ronaldo")).toBe(false);
  });
});

describe("Clue Service", () => {
  it("should detect when clue limit is reached", () => {
    expect(hasReachedClueLimit(3, 3)).toBe(true);
  });

  it("should allow clue usage below limit", () => {
    expect(hasReachedClueLimit(2, 3)).toBe(false);
  });

  it("should detect when clue limit is exceeded", () => {
    expect(hasReachedClueLimit(4, 3)).toBe(true);
  });

  it("should handle zero limit", () => {
    expect(hasReachedClueLimit(0, 0)).toBe(true);
    expect(hasReachedClueLimit(1, 0)).toBe(true);
  });
});

describe("Round Service", () => {
  it("should identify expired rounds", () => {
    const expiredRound = {
      id: "test-1",
      session_id: "session-1",
      player_id: 1,
      clues_used: 0,
      expires_at: Math.floor(Date.now() / 1000) - 100, // 100 seconds ago
      started_at: undefined,
    };

    expect(isRoundExpired(expiredRound)).toBe(true);
  });

  it("should identify active rounds", () => {
    const activeRound = {
      id: "test-1",
      session_id: "session-1",
      player_id: 1,
      clues_used: 0,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      started_at: undefined,
    };

    expect(isRoundExpired(activeRound)).toBe(false);
  });

  it("should handle rounds without expiry", () => {
    const noExpiryRound = {
      id: "test-1",
      session_id: "session-1",
      player_id: 1,
      clues_used: 0,
      expires_at: null,
      started_at: undefined,
    };

    expect(isRoundExpired(noExpiryRound)).toBe(false);
  });

  it("should validate round ownership", () => {
    const round = {
      id: "test-1",
      session_id: "session-1",
      player_id: 1,
      clues_used: 0,
      expires_at: null,
      started_at: undefined,
    };

    expect(validateRoundOwnership(round, "session-1")).toBe(true);
    expect(validateRoundOwnership(round, "session-2")).toBe(false);
  });
});
