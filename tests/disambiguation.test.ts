import { describe, it, expect, vi } from "vitest";
import { isCorrectGuess } from "../server/services/guess";
import { searchPlayers } from "../server/services/player";
import db from "../server/db/connection";

// Mock DB for search tests
vi.mock("../server/db/connection", () => ({
  default: {
    prepare: vi.fn(),
  },
}));

describe("Disambiguation Logic", () => {
  describe("isCorrectGuess", () => {
    it("accepts exact matches", () => {
      expect(isCorrectGuess("Fernando", "Fernando")).toBe(true);
      expect(isCorrectGuess("fernando", "Fernando")).toBe(true);
    });

    it("accepts disambiguated guess for base name", () => {
      // User types/selects "Fernando (Fernando Francisco Reges)"
      // Target player name is "Fernando"
      expect(
        isCorrectGuess("Fernando (Fernando Francisco Reges)", "Fernando"),
      ).toBe(true);
    });

    it("accepts disambiguated guess with weird spacing", () => {
      expect(isCorrectGuess("  Fernando   (Some Guy)  ", "Fernando")).toBe(
        true,
      );
    });

    it("rejects incorrect base name in disambiguation", () => {
      expect(
        isCorrectGuess("Ronaldo (Fernando Francisco Reges)", "Fernando"),
      ).toBe(false);
    });
  });

  describe("searchPlayers Disambiguation", () => {
    it("returns unique names as-is", () => {
      const mockRows = [{ name: "Messi", tm_full_name: "Lionel Messi" }];
      (db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockRows),
      });

      const results = searchPlayers("Messi");
      expect(results).toEqual(["Messi"]);
    });

    it("disambiguates duplicates", () => {
      const mockRows = [
        { name: "Fernando", tm_full_name: "Fernando Francisco Reges" },
        { name: "Fernando", tm_full_name: "Fernando Gómez Colomer" },
      ];
      (db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockRows),
      });

      const results = searchPlayers("Fernando");
      // Should return formatted strings
      expect(results).toContain("Fernando (Fernando Francisco Reges)");
      expect(results).toContain("Fernando (Fernando Gómez Colomer)");
    });

    it("handles duplicates where one IS the full name", () => {
      // Edge case: Name is "Fred" and Full Name is "Fred" (rare but possible)
      // Implementation detail: if name === full_name, it won't append (Full Name)
      const mockRows = [
        { name: "Fred", tm_full_name: "Fred Someone" },
        { name: "Fred", tm_full_name: "Fred" },
      ];
      (db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockRows),
      });

      const results = searchPlayers("Fred");
      expect(results).toContain("Fred (Fred Someone)");
      expect(results).toContain("Fred"); // No parenthesis for the second one
    });
  });
});
