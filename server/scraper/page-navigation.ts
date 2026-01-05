/**
 * Page Navigation
 * Handles navigating to player pages
 */

import type { Page } from "puppeteer";

/**
 * Navigate to a player page (by URL or search)
 */
export async function navigateToPlayer(
  page: Page,
  playerIdentifier: string,
): Promise<void> {
  const isUrl = /^https?:\/\//i.test(playerIdentifier);

  if (isUrl) {
    // Direct URL navigation
    await page.goto(playerIdentifier, {
      waitUntil: "networkidle2",
      timeout: 0,
    });
  } else {
    // Search and click first result
    await page.goto(
      `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(
        playerIdentifier,
      )}`,
      {
        waitUntil: "networkidle2",
        timeout: 0,
      },
    );

    const firstLink =
      ".responsive-table:first-of-type tbody tr:first-of-type td.hauptlink>a";
    await page.waitForSelector(firstLink, { timeout: 60000 });
    await page.click(firstLink);
  }

  // Wait for player data to load
  await page.waitForSelector("div.spielerdatenundfakten", {
    timeout: 60000,
  });
}

/**
 * Extract TransferMarkt ID from player input
 */
export function extractTmId(playerIdentifier: string): number | null {
  if (!/^https?:\/\//i.test(playerIdentifier)) {
    return null;
  }
  const match = playerIdentifier.match(/spieler\/(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}
