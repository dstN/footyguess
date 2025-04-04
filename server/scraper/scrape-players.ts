// 📁 server/scraper/scrape-players.ts
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { upsertPlayer, upsertClub } from "../db/insert";
import { initSchema } from "../db/schema";
import db from "../db/connection";
import { performance } from "perf_hooks";
import { scrapeTransfersForPlayer } from "./scrape-transfers";
import { scrapeCareerStatsForPlayer } from "./scrape-career";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

(async () => {
  initSchema();

  const inputPath = path.resolve("one_player.json");
  const rawData = fs.readFileSync(inputPath, "utf8");
  const players = JSON.parse(rawData).map((p: { name: string }) => p.name);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-notifications",
      "--disable-popup-blocking",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });

  let cookieHandled = false;
  const globalStart = performance.now();
  let totalScrapeTime = 0;

  for (const name of players) {
    const label = `[${players.indexOf(name) + 1}/${players.length}]`;
    const start = performance.now();
    console.log(`${label} 🔍 Lade ${name} ...`);

    try {
      await page.goto(
        `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(
          name
        )}`,
        {
          waitUntil: "networkidle2",
          timeout: 0,
        }
      );

      if (!cookieHandled) {
        try {
          await page.waitForSelector("iframe[id^='sp_message_iframe_']", {
            timeout: 5000,
          });
          const frameHandle = await page.$("iframe[id^='sp_message_iframe_']");
          const frame = await frameHandle?.contentFrame();
          const acceptButton = await frame?.$("button.accept-all");
          if (acceptButton) await acceptButton.click();
          cookieHandled = true;
          await sleep(500);
        } catch {}
      }

      const firstLink =
        ".responsive-table:first-of-type tbody tr:first-of-type td.hauptlink>a";
      await page.waitForSelector(firstLink, { timeout: 60000 });
      await page.click(firstLink);
      await page.waitForSelector("div.spielerdatenundfakten", {
        timeout: 60000,
      });

      const shirt_number = await page.evaluate(() => {
        const el = document.querySelector("span.data-header__shirt-number");
        if (!el) return null;
        const text = el.textContent?.trim().replace("#", "").trim();
        const num = parseInt(text ?? "", 10);
        return isNaN(num) ? null : num;
      });

      const birthplace = await page.evaluate(() => {
        const el = document.querySelector('span[itemprop="birthPlace"]');
        return el?.textContent?.trim() || "";
      });

      const nationalities = await page.evaluate(() => {
        const label = Array.from(
          document.querySelectorAll("span.info-table__content--regular")
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

      const { main_position, secondary_positions } = await page.evaluate(() => {
        const mainSelector1 = document.querySelector(
          ".detail-position__inner-box dd.detail-position__position"
        );
        const mainSelectorFallback = document.querySelector(
          ".detail-position__box > dd.detail-position__position"
        );

        const main_position =
          mainSelector1?.textContent?.trim() ||
          mainSelectorFallback?.textContent?.trim() ||
          "";

        const secondary_positions: string[] = [];
        const secondaryNodes = document.querySelectorAll(
          ".detail-position__position dd.detail-position__position"
        );

        secondaryNodes.forEach((node) => {
          const text = node.textContent?.trim();
          if (text && text !== main_position) {
            secondary_positions.push(text);
          }
        });

        return {
          main_position,
          secondary_positions,
        };
      });

      const birthHref = await page.$$eval(
        "div.spielerdatenundfakten a",
        (links) => {
          const match = links.find((el) =>
            el.getAttribute("href")?.match(/\/\d{4}-\d{2}-\d{2}$/)
          );
          return match?.getAttribute("href") || null;
        }
      );

      const birthdate = birthHref ? birthHref.split("/").pop() ?? null : null;

      const height_cm = await page.evaluate(() => {
        const label = Array.from(
          document.querySelectorAll("span.info-table__content--regular")
        ).find((el) => el.textContent?.trim() === "Height:");
        const value = label?.nextElementSibling?.textContent?.trim() ?? null;
        if (!value) return null;
        const match = value.match(/(\d+,\d{2})/);
        if (!match) return null;
        return Math.round(parseFloat(match[1].replace(",", ".")) * 100);
      });

      const active: boolean | null = await page.evaluate(() => {
        const box = document.querySelector("div.data-header__box--big");
        if (!box) return null;
        const club = box
          .querySelector("span.data-header__club")
          ?.textContent?.trim();
        const alt = box.querySelector("img[alt]")?.getAttribute("alt")?.trim();
        return !(club === "Retired" || alt === "Retired");
      });

      let retired_since: string | null = null;
      if (active === false) {
        const raw = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll(
              "div.data-header__box--big span.data-header__label"
            )
          ).find((el) => el.textContent?.includes("Retired since:"));
          return (
            label
              ?.querySelector("span.data-header__content")
              ?.textContent?.trim() ?? null
          );
        });
        if (raw) {
          const parsed = new Date(raw);
          retired_since = isNaN(parsed.getTime())
            ? null
            : parsed.toISOString().split("T")[0];
        }
      }

      const foot = await page.evaluate(() => {
        const label = Array.from(
          document.querySelectorAll("span.info-table__content--regular")
        ).find((el) => el.textContent?.trim() === "Foot:");
        return label?.nextElementSibling?.textContent?.trim() ?? null;
      });

      let current_club_id: number | null = null;

      if (active === true) {
        const clubInfo = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll("span.info-table__content--regular")
          ).find((el) => el.textContent?.trim() === "Current club:");
          const value = label?.nextElementSibling;
          const name =
            value?.querySelector("a[title]")?.textContent?.trim() ?? null;
          const href = value?.querySelector("a")?.getAttribute("href") ?? "";
          const idMatch = href.match(/verein\/(\d+)/);
          const clubId = idMatch ? parseInt(idMatch[1]) : null;
          const img = value?.querySelector("img");
          const srcset = img?.getAttribute("srcset") ?? "";
          const logo = srcset.split(",")[0]?.split(" ")[0] ?? null;
          return { name, clubId, logo };
        });

        if (clubInfo?.clubId) {
          const exists = db
            .prepare("SELECT 1 FROM clubs WHERE id = ?")
            .get(clubInfo.clubId);
          current_club_id = clubInfo.clubId;

          if (!exists && clubInfo.name && clubInfo.logo) {
            const safeLogoUrl = clubInfo.logo.startsWith("http")
              ? clubInfo.logo
              : `https:${clubInfo.logo}`;
            const safeName = clubInfo.name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9\-]/g, "");
            const filename = `${safeName}.png`;
            const logoPath = `/assets/logos/${filename}`;
            const logoDir = path.resolve("public/assets/logos");
            const fullPath = path.join(logoDir, filename);

            if (!fs.existsSync(logoDir))
              fs.mkdirSync(logoDir, { recursive: true });
            if (!fs.existsSync(fullPath)) {
              const res = await fetch(safeLogoUrl);
              if (res.ok) {
                const buffer = await res.arrayBuffer();
                fs.writeFileSync(fullPath, Buffer.from(buffer));
              }
            }

            upsertClub(clubInfo.clubId, clubInfo.name, logoPath);
          }
        }
      }

      upsertPlayer({
        name,
        birthdate: birthdate ?? null,
        height_cm,
        active: active === null ? null : active ? 1 : 0,
        retired_since,
        foot,
        current_club_id,
        total_worth: null,
        shirt_number: shirt_number,
        birthplace: birthplace,
        main_position: main_position,
        secondary_positions: secondary_positions,
        nationalities: nationalities,
      });

      const playerRecord = db
        .prepare("SELECT id FROM players WHERE name = ?")
        .get(name) as { id: number } | undefined;
      const playerId = playerRecord?.id;
      if (playerId) {
        await scrapeTransfersForPlayer(page, playerId, name, true);
        await scrapeCareerStatsForPlayer(page, playerId, name);
      }

      const duration = (performance.now() - start) / 1000;
      totalScrapeTime += duration;
      console.log(`${label} ✅ ${name} fertig in ${duration.toFixed(2)}s`);
    } catch (err) {
      console.error("❌ Fehler bei:", name, err);
    }

    await sleep(500);
  }

  await browser.close();

  const totalDuration = (performance.now() - globalStart) / 1000;
  console.log(`\n🏁 Gesamtdauer: ${totalDuration.toFixed(2)}s`);
  console.log(
    `📊 Ø Scrape-Zeit pro Spieler: ${(totalScrapeTime / players.length).toFixed(
      2
    )}s`
  );
})();
