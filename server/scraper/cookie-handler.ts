/**
 * Cookie Handler
 * Manages cookie consent dialogs on scraper sites
 */

import type { Page } from "puppeteer";
import { sleep } from "./browser-utils.ts";

/**
 * Manager for handling cookie consent dialogs
 */
export class CookieManager {
  private handled = false;
  private handling: Promise<void> | null = null;

  /**
   * Ensure cookies are handled (idempotent)
   */
  async ensure(page: Page): Promise<void> {
    if (this.handled) return;
    if (this.handling) {
      await this.handling;
      return;
    }

    this.handling = this.handleCookies(page);
    await this.handling;
  }

  /**
   * Handle cookie consent iframe and button
   */
  private async handleCookies(page: Page): Promise<void> {
    try {
      await page.waitForSelector("iframe[id^='sp_message_iframe_']", {
        timeout: 5000,
      });
      const frameHandle = await page.$("iframe[id^='sp_message_iframe_']");
      const frame = await frameHandle?.contentFrame();
      const acceptButton = await frame?.$("button.accept-all");
      if (acceptButton) {
        await acceptButton.click();
        this.handled = true;
        await sleep(500);
      }
    } catch {
      // ignore cookie errors
    } finally {
      if (!this.handled) {
        this.handling = null;
      }
    }
  }
}
