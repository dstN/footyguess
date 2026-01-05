/**
 * Puppeteer Utilities
 * Handles browser initialization and page setup
 */

import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";

/**
 * Launch browser with optimal scraping settings
 */
export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-notifications",
      "--disable-popup-blocking",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=site-per-process",
    ],
  });
}

/**
 * Create new page with standard viewport and timeout
 */
export async function createScrapePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 2000 });
  page.setDefaultTimeout(30000);
  return page;
}

/**
 * Close page gracefully
 */
export async function closePage(page: Page): Promise<void> {
  try {
    await page.close();
  } catch {
    // ignore close errors
  }
}

/**
 * Sleep utility
 */
export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
