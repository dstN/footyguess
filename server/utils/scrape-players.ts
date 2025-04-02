import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

interface PlayerData {
  name: string;
  birthDate?: string;
  heightCm?: number;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Input laden
const inputPath = path.resolve("players.json");
const rawData = fs.readFileSync(inputPath, "utf8");
const players = JSON.parse(rawData).map((p: { name: string }) => p.name);

const result: PlayerData[] = [];

const globalStart = performance.now(); // 🕐 Start Gesamtzeit

(async () => {
  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-notifications",
      "--disable-popup-blocking",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  let cookieHandled = false;
  let totalScrapeTime = 0;

  for (let i = 0; i < players.length; i++) {
    const name = players[i];
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1024 });

    const start = performance.now();
    const playerLabel = `[${i + 1}/${players.length}]`;

    try {
      console.log(`${playerLabel} 🔍 Starte mit ${name} ...`);

      await page.goto(
        `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(
          name
        )}`,
        { waitUntil: "networkidle2", timeout: 0 }
      );

      // Cookie-Banner nur beim ersten Mal
      if (!cookieHandled) {
        try {
          await page.waitForSelector("iframe[id^='sp_message_iframe_']", {
            timeout: 5000,
          });
          const frameHandle = await page.$("iframe[id^='sp_message_iframe_']");
          const frame = await frameHandle?.contentFrame();
          const acceptButton = await frame?.$("button.accept-all");
          if (acceptButton) {
            await acceptButton.click();
            await sleep(500);
          }
          cookieHandled = true;
        } catch {
          console.log("⚠️ Kein Cookie-Banner – vermutlich schon akzeptiert");
        }
      }

      // Erstes Suchergebnis klicken
      const firstLink =
        ".responsive-table:first-of-type tbody tr:first-of-type td.hauptlink>a";
      await page.waitForSelector(firstLink, { timeout: 10000 });
      await page.click(firstLink);

      // Geburtstag extrahieren
      const birthDateHref = await page.$$eval(
        "div.spielerdatenundfakten a",
        (links) => {
          const match = links.find((el) =>
            el.getAttribute("href")?.match(/\/\d{4}-\d{2}-\d{2}$/)
          );
          return match?.getAttribute("href") || null;
        }
      );

      const birthDate = birthDateHref
        ? birthDateHref.substring(birthDateHref.lastIndexOf("/") + 1)
        : undefined;

      // Größe extrahieren und in cm umrechnen
      const heightCm = await page.$$eval(
        "div.spielerdatenundfakten span",
        (spans) => {
          const match = spans.find((el) =>
            el.textContent?.trim().match(/^\d,\d{2} m$/)
          );
          const raw = match?.textContent?.trim();
          if (!raw) return undefined;
          const num = parseFloat(raw.replace(",", "."));
          return Math.round(num * 100);
        }
      );

      result.push({
        name,
        birthDate,
        heightCm,
      });

      const duration = (performance.now() - start) / 1000;
      totalScrapeTime += duration;

      console.log(
        `${playerLabel} ✅ ${name} fertig in ${duration.toFixed(2)}s`
      );
    } catch (err) {
      console.error(`${playerLabel} ❌ Fehler bei ${name}:`, err);
    }

    await page.close();
    await sleep(500);
  }

  await browser.close();

  // Ergebnis speichern
  const outputPath = path.resolve("players-output.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n💾 Gespeichert in: ${outputPath}`);

  // Zeit auswerten
  const totalDuration = (performance.now() - globalStart) / 1000;
  const avgPerPlayer = totalScrapeTime / players.length;

  console.log(`🏁 Gesamtdauer: ${totalDuration.toFixed(2)}s`);
  console.log(`📊 Ø pro Spieler (Scrape): ${avgPerPlayer.toFixed(2)}s`);
})();
