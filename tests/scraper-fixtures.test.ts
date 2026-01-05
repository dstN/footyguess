import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import db, { resetDb } from "./utils/db";
import { scrapeTransfersForPlayer } from "../server/scraper/scrape-transfers";
import { scrapeCareerStatsForPlayer } from "../server/scraper/scrape-career";

describe("scraper fixtures", () => {
  let browser: puppeteer.Browser;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(() => {
    resetDb();
  });

  it("parses transfer history fixture", async () => {
    db.prepare(`INSERT INTO players (id, name, active) VALUES (?, ?, ?)`).run(
      1,
      "Fixture Player",
      1,
    );

    const page = await browser.newPage();
    const html = fs.readFileSync(
      path.resolve("tests/fixtures/transfer-history.html"),
      "utf8",
    );
    await page.setContent(html);

    await scrapeTransfersForPlayer(page, 1, "Fixture Player", true);

    const count = db
      .prepare(`SELECT COUNT(*) AS count FROM transfers WHERE player_id = ?`)
      .get(1) as { count: number };
    expect(count.count).toBe(2);

    await page.close();
  });

  it("parses career stats fixture", async () => {
    db.prepare(`INSERT INTO players (id, name, active) VALUES (?, ?, ?)`).run(
      2,
      "Fixture Player",
      1,
    );

    const page = await browser.newPage();
    const html = fs.readFileSync(
      path.resolve("tests/fixtures/career-stats.html"),
      "utf8",
    );
    await page.setContent(html);

    await scrapeCareerStatsForPlayer(page, 2, "Fixture Player", {
      skipNavigation: true,
    });

    const stats = db
      .prepare(`SELECT COUNT(*) AS count FROM player_stats WHERE player_id = ?`)
      .get(2) as { count: number };
    expect(stats.count).toBe(1);

    await page.close();
  });
});
