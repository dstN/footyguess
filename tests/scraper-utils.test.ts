/**
 * Tests for scraper utility modules
 */

import { describe, it, expect } from "vitest";
import {
  titleizeSlug,
  extractPlayerName,
  normalizePlayerName,
} from "~/server/scraper/player-utils";
import { extractTmId } from "~/server/scraper/page-navigation";

describe("Player Utils", () => {
  it("should titleize slugs correctly", () => {
    expect(titleizeSlug("cristiano-ronaldo")).toBe("Cristiano Ronaldo");
    expect(titleizeSlug("leo-messi")).toBe("Leo Messi");
    expect(titleizeSlug("a-b-c")).toBe("A B C");
  });

  it("should handle single word slugs", () => {
    expect(titleizeSlug("ronaldo")).toBe("Ronaldo");
  });

  it("should extract player names from paths", () => {
    expect(extractPlayerName("/profile/player/cristiano-ronaldo")).toBe(
      "Cristiano Ronaldo",
    );
  });

  it("should normalize player names", () => {
    expect(normalizePlayerName("  Cristiano Ronaldo  ")).toBe(
      "Cristiano Ronaldo",
    );
    expect(normalizePlayerName("Messi")).toBe("Messi");
  });
});

describe("Page Navigation", () => {
  it("should extract tm id from URL", () => {
    const url =
      "https://www.transfermarkt.com/cristiano-ronaldo/profil/spieler/8198";
    expect(extractTmId(url)).toBe(8198);
  });

  it("should handle non-URL input", () => {
    expect(extractTmId("Cristiano Ronaldo")).toBe(null);
  });

  it("should extract tm id from arbitrary URLs with spieler/", () => {
    const url = "https://example.com/spieler/12345/some/path";
    expect(extractTmId(url)).toBe(12345);
  });

  it("should return null if no ID found", () => {
    const url = "https://www.transfermarkt.com/cristiano-ronaldo/profile";
    expect(extractTmId(url)).toBe(null);
  });
});
