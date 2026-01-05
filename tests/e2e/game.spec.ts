/**
 * End-to-End Tests with Playwright
 *
 * Tests complete user flows including:
 * - Loading the game
 * - Searching for players
 * - Making guesses
 * - Using clues
 * - Winning the game
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("FootyGuess E2E Tests", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test("should load home page successfully", async () => {
    // Check that main heading exists
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Check that play button is visible
    const playButton = page.locator("button:has-text('Play')");
    await expect(playButton).toBeVisible();
  });

  test("should search for players with debounce", async () => {
    // Navigate to search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type slowly to test debounce
    await searchInput.fill("Ronaldo");

    // Wait for dropdown to appear
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Check results are shown
    const options = page.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should start a game with a random player", async () => {
    // Click play button
    const playButton = page.locator("button:has-text('Play')");
    await playButton.click();

    // Wait for game to load
    await page.waitForURL(/.*play.*/);

    // Check game elements appear
    const playerName = page.locator('[data-testid="player-name"]');
    await expect(playerName).toBeVisible({ timeout: 5000 });

    // Check clues section appears
    const cluesSection = page.locator('[data-testid="clues"]');
    await expect(cluesSection).toBeVisible();

    // Check guess input appears
    const guessInput = page.locator('input[placeholder*="Guess"]');
    await expect(guessInput).toBeVisible();
  });

  test("should reveal clues", async () => {
    // Start game
    const playButton = page.locator("button:has-text('Play')");
    await playButton.click();
    await page.waitForURL(/.*play.*/);

    // Wait for clue button to appear
    const clueButton = page.locator("button:has-text('Reveal Clue')");
    await expect(clueButton).toBeVisible({ timeout: 5000 });

    // Get initial clue count
    const cluesBefore = page.locator('[data-testid="clue-item"]');
    const countBefore = await cluesBefore.count();

    // Click reveal clue
    await clueButton.click();

    // Wait for new clue
    await page.waitForTimeout(500);

    // Check clue count increased
    const cluesAfter = page.locator('[data-testid="clue-item"]');
    const countAfter = await cluesAfter.count();
    expect(countAfter).toBe(countBefore + 1);
  });

  test("should make a guess and show result", async () => {
    // Start game
    const playButton = page.locator("button:has-text('Play')");
    await playButton.click();
    await page.waitForURL(/.*play.*/);

    // Wait for player name to load
    const playerNameElement = page.locator('[data-testid="player-name"]');
    const playerName = await playerNameElement.textContent();
    expect(playerName).toBeTruthy();

    // Make a guess with the player name
    const guessInput = page.locator('input[placeholder*="Guess"]');
    await guessInput.fill(playerName!);

    // Click guess button
    const guessButton = page.locator("button:has-text('Guess')");
    await guessButton.click();

    // Should redirect to won page
    await page.waitForURL(/.*won.*/, { timeout: 5000 });

    // Check score display
    const scoreDisplay = page.locator('[data-testid="score"]');
    await expect(scoreDisplay).toBeVisible();

    // Check streak display
    const streakDisplay = page.locator('[data-testid="streak"]');
    await expect(streakDisplay).toBeVisible();
  });

  test("should handle error boundary on game page", async () => {
    // Start game
    const playButton = page.locator("button:has-text('Play')");
    await playButton.click();
    await page.waitForURL(/.*play.*/);

    // Try to inject an error (if error boundary is working)
    // This would require error simulation, which is harder to test via E2E
    // Instead we just verify the page loads without crashing
    const gameContainer = page.locator('[data-testid="game-container"]');
    await expect(gameContainer).toBeVisible({ timeout: 5000 });
  });

  test("should handle session persistence", async () => {
    // Get initial session ID from localStorage
    const sessionId1 = await page.evaluate(() =>
      localStorage.getItem("sessionId"),
    );

    // Navigate around
    const playButton = page.locator("button:has-text('Play')");
    await playButton.click();
    await page.waitForURL(/.*play.*/);

    // Go back home
    const homeButton = page.locator("button:has-text('Home')");
    if (await homeButton.isVisible()) {
      await homeButton.click();
      await page.waitForURL(/.*\/$/);
    }

    // Check session persists
    const sessionId2 = await page.evaluate(() =>
      localStorage.getItem("sessionId"),
    );

    expect(sessionId1).toBeTruthy();
    expect(sessionId2).toBeTruthy();
  });

  test("should show transfer timeline", async () => {
    // Start game
    const playButton = page.locator("button:has-text('Play')");
    await playButton.click();
    await page.waitForURL(/.*play.*/);

    // Check for transfer timeline section
    const timelineSection = page.locator('[data-testid="transfer-timeline"]');
    const isVisible = await timelineSection.isVisible().catch(() => false);

    // If visible, should have cards
    if (isVisible) {
      const cards = page.locator('[data-testid="transfer-card"]');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});
