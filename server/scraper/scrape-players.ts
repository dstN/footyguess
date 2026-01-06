import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Page } from "puppeteer";
import db from "../db/connection.ts";
import { upsertClub, upsertPlayer } from "../db/insert.ts";
import { initSchema } from "../db/schema.ts";
import { scrapeCareerStatsForPlayer } from "./scrape-career.ts";
import { scrapeTransfersForPlayer } from "./scrape-transfers.ts";
import { logError, rotateTextLog } from "../utils/logger.ts";

// Apply stealth plugin to hide automation signals
puppeteer.use(StealthPlugin());

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const SCRAPER_WORKERS = Math.max(
  1,
  Number(process.env.SCRAPER_WORKERS ?? 1)
);
const SCRAPER_DELAY_MS = Number(process.env.SCRAPER_DELAY_MS ?? 500);

// Random delay between min and max to avoid detection
function getRandomDelay(min: number = 1000, max: number = 3000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function titleizeSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function logScrapeError(context: string, name: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const errorLog = `[${new Date().toISOString()}] ${context} ${name}: ${message}\n`;
  rotateTextLog("error.txt");
  fs.appendFileSync("error.txt", errorLog, "utf8");
  logError(`scrape error: ${context} ${name}`, err);
}

(async () => {
  initSchema();

  const requestedUrls = process.env.REQUESTED_URLS;
  const players = requestedUrls
    ? (JSON.parse(requestedUrls) as string[])
    : JSON.parse(fs.readFileSync(path.resolve("all_players.json"), "utf8")).map(
        (p: { name: string }) => p.name,
      );

  const globalStart = performance.now();
  let totalScrapeTime = 0;
  let nextIndex = 0;
  let cookieHandled = false;
  let cookieHandling: Promise<void> | null = null;

  async function ensureCookies(page: Page) {
    if (cookieHandled) return;
    if (cookieHandling) {
      await cookieHandling;
      return;
    }

    cookieHandling = (async () => {
      try {
        await page.waitForSelector("iframe[id^='sp_message_iframe_']", {
          timeout: 5000,
        });
        const frameHandle = await page.$("iframe[id^='sp_message_iframe_']");
        const frame = await frameHandle?.contentFrame();
        const acceptButton = await frame?.$("button.accept-all");
        if (acceptButton) {
          await acceptButton.click();
          cookieHandled = true;
          await sleep(500);
        }
      } catch {
        // ignore cookie errors
      } finally {
        if (!cookieHandled) {
          cookieHandling = null;
        }
      }
    })();

    await cookieHandling;
  }

  const browser = await puppeteer.launch({
    headless: false,
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

  async function runWorker(workerId: number) {
    const page = await browser.newPage();
    // Disable JavaScript to test if content is server-rendered or JS-rendered
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 1080, height: 2000 });
    // Set realistic user-agent to avoid blocking
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    // Set realistic headers to look like a real browser
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Referer": "https://www.google.com/",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    });

    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= players.length) break;

      const name = players[currentIndex];
      let nameForDb = name;
      const label = `[${currentIndex + 1}/${players.length}]`;
      const isUrl = /^https?:\/\//i.test(name);
      const tmIdFromUrl = isUrl
        ? Number.parseInt(name.match(/spieler\/(\d+)/i)?.[1] ?? "", 10)
        : null;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleCutoff = nowSeconds - 60 * 60 * 24 * 7 * 8;

      if (isUrl && tmIdFromUrl) {
        const existing = db
          .prepare("SELECT last_scraped_at FROM players WHERE tm_id = ?")
          .get(tmIdFromUrl) as { last_scraped_at: number | null } | undefined;
        if (
          existing?.last_scraped_at &&
          existing.last_scraped_at >= staleCutoff
        ) {
          console.log(`${label} Skip: tm_id ${tmIdFromUrl} recently scraped.`);
          continue;
        }
      }

      // Skip if player already exists in DB and was scraped recently
      if (!isUrl) {
        const existing = db
          .prepare("SELECT last_scraped_at FROM players WHERE name = ?")
          .get(name) as { last_scraped_at: number | null } | undefined;
        if (existing) {
          if (
            existing.last_scraped_at &&
            existing.last_scraped_at >= staleCutoff
          ) {
            console.log(`${label} Skip: ${name} recently scraped.`);
            continue;
          }
          console.log(
            `${label} Re-scrape: ${name} last updated > 8 weeks ago.`,
          );
        }
      }

      const start = performance.now();
      console.log(`${label} Loading ${name}...`);

      try {
        let response;
        if (isUrl) {
          response = await page.goto(name, {
            waitUntil: "networkidle2",
            timeout: 0,
          });
        } else {
          response = await page.goto(
            `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(
              name,
            )}`,
            {
              waitUntil: "networkidle2",
              timeout: 0,
            },
          );
        }

        // Check for rate limiting or server errors
        if (response && (response.status() === 429 || response.status() === 503 || response.status() === 504)) {
          logScrapeError("Network Error", name, `HTTP ${response.status()} - Server blocked/overloaded. Stopping scraper.`);
          process.exit(1);
        }

        await ensureCookies(page);

        if (!isUrl) {
          const firstLink =
            ".responsive-table:first-of-type tbody tr:first-of-type td.hauptlink>a";
          await page.waitForSelector(firstLink, { timeout: 60000 });
          await page.click(firstLink);
        }
        await page.waitForSelector("div.spielerdatenundfakten", {
          timeout: 60000,
        });

        const shirt_number = await page.evaluate(() => {
          const el = document.querySelector("span.data-header__shirt-number");
          if (!el) return null;
          const text = el.textContent?.trim().replace("#", "").trim();
          const num = Number.parseInt(text ?? "", 10);
          return Number.isNaN(num) ? null : num;
        });

        const birthplace = await page.evaluate(() => {
          const el = document.querySelector('span[itemprop="birthPlace"]');
          return el?.textContent?.trim() || "";
        });

        const nationalities = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll("span.info-table__content--regular"),
          ).find((el) => el.textContent?.trim() === "Citizenship:");

          const value = label?.nextElementSibling as HTMLElement | null;
          if (!value) return [];

          const html = value.innerHTML;

          return html
            .split("<br>")
            .map((entry) => {
              const match = entry.match(/&nbsp;&nbsp;([^<]+)/);
              return match?.[1].trim() ?? null;
            })
            .filter((x): x is string => !!x);
        });

        const { main_position, secondary_positions } = await page.evaluate(
          () => {
            const mainSelector1 = document.querySelector(
              ".detail-position__inner-box dd.detail-position__position",
            );
            const mainSelectorFallback = document.querySelector(
              ".detail-position__box > dd.detail-position__position",
            );

            const main_position =
              mainSelector1?.textContent?.trim() ||
              mainSelectorFallback?.textContent?.trim() ||
              "";

            const secondary_positions: string[] = [];
            const secondaryNodes = Array.from(
              document.querySelectorAll(
                ".detail-position__position dd.detail-position__position",
              ),
            );

            for (const node of secondaryNodes) {
              const text = node.textContent?.trim();
              if (text && text !== main_position) {
                secondary_positions.push(text);
              }
            }

            return {
              main_position,
              secondary_positions,
            };
          },
        );

        const birthHref = await page.$$eval(
          "div.spielerdatenundfakten a",
          (links) => {
            const match = links.find((el) =>
              el.getAttribute("href")?.match(/\/\d{4}-\d{2}-\d{2}$/),
            );
            return match?.getAttribute("href") || null;
          },
        );

        const birthdate = birthHref
          ? (birthHref.split("/").pop() ?? null)
          : null;

        const height_cm = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll("span.info-table__content--regular"),
          ).find((el) => el.textContent?.trim() === "Height:");
          const value = label?.nextElementSibling?.textContent?.trim() ?? null;
          if (!value) return null;
          const match = value.match(/(\d+,\d{2})/);
          if (!match) return null;
          return Math.round(
            Number.parseFloat(match[1].replace(",", ".")) * 100,
          );
        });

        const active: boolean = await page.evaluate(() => {
          const box = document.querySelector("div.data-header__box--big");
          if (!box) return true;
          const club = box
            .querySelector("span.data-header__club")
            ?.textContent?.trim();
          const alt = box
            .querySelector("img[alt]")
            ?.getAttribute("alt")
            ?.trim();
          return !(club === "Retired" || alt === "Retired");
        });

        let retired_since: string | null = null;
        if (active === false) {
          const raw = await page.evaluate(() => {
            const label = Array.from(
              document.querySelectorAll(
                "div.data-header__box--big span.data-header__label",
              ),
            ).find((el) => el.textContent?.includes("Retired since:"));
            return (
              label
                ?.querySelector("span.data-header__content")
                ?.textContent?.trim() ?? null
            );
          });
          if (raw) {
            const parsed = new Date(raw);
            retired_since = Number.isNaN(parsed.getTime())
              ? null
              : parsed.toISOString().split("T")[0];
          }
        }

        const foot = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll("span.info-table__content--regular"),
          ).find((el) => el.textContent?.trim() === "Foot:");
          return label?.nextElementSibling?.textContent?.trim() ?? null;
        });

        const profileUrl = page.url();
        const urlMatch = profileUrl.match(
          /transfermarkt\.com\/([^\/]+)\/profil\/spieler\/(\d+)/i,
        );
        const tmShortSlug = urlMatch?.[1] ?? null;
        const tmId = urlMatch?.[2] ? Number.parseInt(urlMatch[2], 10) : null;
        const tmShortName = tmShortSlug ? titleizeSlug(tmShortSlug) : null;

        const headlineName = await page.evaluate(() => {
          const h1 = document.querySelector("h1");
          if (!h1) return null;
          h1.querySelectorAll("span.data-header__shirt-number").forEach((el) =>
            el.remove(),
          );
          return h1.textContent?.trim() || null;
        });

        const fullName = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll("span.info-table__content--regular"),
          ).find((el) => el.textContent?.trim() === "Full name:");
          const value = label?.nextElementSibling;
          return value && value.textContent ? value.textContent.trim() : null;
        });

        const shortName = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll("span.info-table__content--regular"),
          ).find((el) => el.textContent?.trim() === "Short name:");
          const value = label?.nextElementSibling;
          return value && value.textContent ? value.textContent.trim() : null;
        });

        nameForDb = shortName || headlineName || tmShortName || name;
        const tmShortDisplay = shortName || headlineName || tmShortName;

        let current_club_id: number | null = null;

        if (active === true) {
          const clubInfo = await page.evaluate(() => {
            const label = Array.from(
              document.querySelectorAll("span.info-table__content--regular"),
            ).find((el) => el.textContent?.trim() === "Current club:");
            const value = label?.nextElementSibling;
            const name =
              value?.querySelector("a[title]")?.textContent?.trim() ?? null;
            const href = value?.querySelector("a")?.getAttribute("href") ?? "";
            const idMatch = href.match(/verein\/(\d+)/);
            const clubId = idMatch ? Number.parseInt(idMatch[1], 10) : null;
            return { name, clubId };
          });

          if (clubInfo?.clubId) {
            const exists = db
              .prepare("SELECT 1 FROM clubs WHERE id = ?")
              .get(clubInfo.clubId);
            current_club_id = clubInfo.clubId;

            if (!exists && clubInfo.name) {
              upsertClub(clubInfo.clubId, clubInfo.name as string, null);
            }
          }
        }

        upsertPlayer({
          name: nameForDb,
          tm_id: tmId,
          tm_url: profileUrl,
          tm_short_name: tmShortDisplay,
          tm_full_name: fullName,
          last_scraped_at: nowSeconds,
          birthdate: birthdate ?? null,
          height_cm,
          active: active ? 1 : 0,
          retired_since,
          foot,
          current_club_id,
          total_worth: null,
          shirt_number: shirt_number,
          birthplace: birthplace,
          main_position: main_position,
          secondary_positions: secondary_positions,
          nationalities: nationalities,
          total_stats: [],
        });

        const playerRecord = (
          tmId
            ? db.prepare("SELECT id FROM players WHERE tm_id = ?").get(tmId)
            : db.prepare("SELECT id FROM players WHERE name = ?").get(nameForDb)
        ) as { id: number } | undefined;
        const playerId = playerRecord?.id;
        if (playerId) {
          try {
            await scrapeTransfersForPlayer(page, playerId, nameForDb, true);
          } catch (err) {
            console.warn("Transfers scrape failed for:", nameForDb, err);
            logScrapeError("transfer-scrape", nameForDb, err);
          }
          try {
            await scrapeCareerStatsForPlayer(page, playerId, nameForDb);
          } catch (err) {
            console.warn("Stats scrape failed for:", nameForDb, err);
            logScrapeError("stats-scrape", nameForDb, err);
          }
        }

        const duration = (performance.now() - start) / 1000;
        totalScrapeTime += duration;
        console.log(`${label} Done: ${nameForDb} in ${duration.toFixed(2)}s`);
      } catch (err) {
        console.error("Error for:", nameForDb, err);
        logScrapeError("player-scrape", nameForDb, err);
      }

      // Use randomized delay to avoid detection (1-3 seconds)
      const randomDelay = getRandomDelay(1000, 3000);
      console.log(`${label} Waiting ${randomDelay}ms before next request...`);
      await sleep(randomDelay);
    }
    await page.close();
  }

  await Promise.all(
    Array.from({ length: SCRAPER_WORKERS }, (_, i) => runWorker(i)),
  );

  await browser.close();

  const totalDuration = (performance.now() - globalStart) / 1000;
  console.log(`\nTotal duration: ${totalDuration.toFixed(2)}s`);
  console.log(
    `Scrape time per player: ${(totalScrapeTime / players.length).toFixed(2)}s`,
  );
})();
