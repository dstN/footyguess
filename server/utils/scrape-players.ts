import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

async function downloadImage(url: string, filePath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));
}

const logoDir = path.resolve("public/assets/logos");
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

interface PlayerData {
  name: string;
  birthDate?: Date | null;
  heightCm?: number | null;
  active?: boolean | null;
  retiredSince?: Date | null;
  foot?: string | null;
  currentClub?: string | null;
  clubLogo?: string | null;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Spieler einlesen
const inputPath = path.resolve("players.json");
const rawData = fs.readFileSync(inputPath, "utf8");
const players = JSON.parse(rawData).map((p: { name: string }) => p.name);

const result: PlayerData[] = [];

const globalStart = performance.now();

(async () => {
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
  await page.setViewport({ width: 1080, height: 1024 });

  let cookieHandled = false;
  let totalScrapeTime = 0;

  for (let i = 0; i < players.length; i++) {
    const name = players[i];
    const start = performance.now();
    const label = `[${i + 1}/${players.length}]`;

    try {
      console.log(`${label} 🔍 Lade ${name} ...`);

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
          console.log("⚠️ Kein Cookie-Banner – wahrscheinlich schon erledigt");
        }
      }

      // Auf erstes Suchergebnis klicken
      const firstLink =
        ".responsive-table:first-of-type tbody tr:first-of-type td.hauptlink>a";
      await page.waitForSelector(firstLink, { timeout: 60000 });
      await page.click(firstLink);

      // Warte auf Profildaten-Block
      await page.waitForSelector("div.spielerdatenundfakten", {
        timeout: 60000,
      });

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
        ? new Date(birthDateHref.substring(birthDateHref.lastIndexOf("/") + 1))
        : null;

      // Größe extrahieren
      const heightCm = await page.evaluate(() => {
        const labelSpan = Array.from(
          document.querySelectorAll("span.info-table__content--regular")
        ).find((el) => el.textContent?.trim() === "Height:");

        const valueSpan = labelSpan?.nextElementSibling as HTMLElement | null;
        if (!valueSpan) return null;

        const raw = valueSpan.textContent?.trim(); // z. B. "1,90 m"
        if (!raw) return null;

        const match = raw.match(/^\d+,\d{2}\s?m$/);
        if (!match) return null;

        const number = parseFloat(raw.replace(",", ".").replace(/\s?m$/, ""));
        return Math.round(number * 100); // → z. B. 190
      });

      // Aktivstatus prüfen
      const isActive = await page.evaluate(() => {
        const box = document.querySelector("div.data-header__box--big");
        if (!box) return null;

        const spanText = box
          .querySelector("span.data-header__club")
          ?.textContent?.trim();
        const imgAlt = box
          .querySelector("img[alt]")
          ?.getAttribute("alt")
          ?.trim();

        if (spanText === "Retired" || imgAlt === "Retired") {
          return false;
        }

        return true;
      });

      let retiredSince: Date | null = null;

      // Wenn nicht aktiv, dann das Datum abfragen seit wann
      if (isActive === false) {
        const retiredDateString = await page.evaluate(() => {
          const label = Array.from(
            document.querySelectorAll(
              "div.data-header__box--big span.data-header__label"
            )
          ).find((el) => el.textContent?.includes("Retired since:"));

          const text = label
            ?.querySelector("span.data-header__content")
            ?.textContent?.trim();

          return text ?? null;
        });

        if (retiredDateString) {
          const parsed = new Date(retiredDateString);
          retiredSince = isNaN(parsed.getTime()) ? null : parsed;
        }
      }

      // Starker Fuß:
      const foot = await page.evaluate(() => {
        const labelSpan = Array.from(
          document.querySelectorAll("span.info-table__content--regular")
        ).find((el) => el.textContent?.trim() === "Foot:");

        const valueSpan = labelSpan?.nextElementSibling as HTMLElement | null;
        return valueSpan?.textContent?.trim() ?? null;
      });

      // Current club wenn aktiv
      let currentClub: string | null = null;
      let clubLogo: string | null = null;

      if (isActive === true) {
        const clubInfo = await page.evaluate(() => {
          const labelSpan = Array.from(
            document.querySelectorAll("span.info-table__content--regular")
          ).find((el) => el.textContent?.trim() === "Current club:");

          const flexSpan = labelSpan?.nextElementSibling;
          const name =
            flexSpan?.querySelector("a[title]")?.textContent?.trim() ?? null;
          const img = flexSpan?.querySelector("img");
          const srcset = img?.getAttribute("srcset") ?? "";

          // srcset = "https://url1 1x, https://url2 2x"
          const firstSrc = srcset.split(",")[0]?.trim().split(" ")[0] ?? null;

          return { name, src: firstSrc };
        });

        console.log(
          `[DEBUG] 🧩 ${name} | club: ${clubInfo?.name} | logo: ${clubInfo?.src}`
        );

        currentClub = clubInfo?.name ?? null;

        if (clubInfo?.src && currentClub) {
          const safeName = currentClub
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/g, "");
          const filename = `${safeName}.png`;
          const fullPath = path.join(logoDir, filename);
          const relativePath = `/assets/logos/${filename}`;

          try {
            await downloadImage(clubInfo.src, fullPath);
            clubLogo = relativePath;
          } catch (err) {
            console.error("❌ Fehler beim Logo-Download:", clubInfo.name, err);
          }
        }
      }

      result.push({
        name,
        birthDate,
        heightCm,
        active: isActive ?? null,
        retiredSince,
        foot,
        currentClub,
        clubLogo,
      });

      const duration = (performance.now() - start) / 1000;
      totalScrapeTime += duration;
      console.log(`${label} ✅ ${name} fertig in ${duration.toFixed(2)}s`);
    } catch (err) {
      console.error(`${label} ❌ Fehler bei ${name}:`, err);
    }

    await sleep(500);
  }

  await browser.close();

  // Ergebnis speichern
  const outputPath = path.resolve("players-output.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n💾 Gespeichert in: ${outputPath}`);

  // Zeit-Statistiken
  const totalDuration = (performance.now() - globalStart) / 1000;
  const avgTime = totalScrapeTime / players.length;

  console.log(`🏁 Gesamtdauer: ${totalDuration.toFixed(2)}s`);
  console.log(`📊 Ø Scrape-Zeit pro Spieler: ${avgTime.toFixed(2)}s`);
})();
