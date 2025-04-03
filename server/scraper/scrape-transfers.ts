// 📁 server/scraper/scrape-transfers.ts
import puppeteer, { Page } from "puppeteer";
import db from "../db/connection";
import { insertTransfer } from "../db/insert";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface PlayerRow {
  id: number;
  name: string;
}

export async function scrapeTransfersForPlayer(
  page: Page,
  playerId: number,
  playerName: string,
  alreadyOnProfile = false
) {
  console.log(`🔄 Transfers von ${playerName} werden geladen...`);

  try {
    if (!alreadyOnProfile) {
      await page.goto(
        `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(
          playerName
        )}`,
        { waitUntil: "networkidle2", timeout: 0 }
      );

      const firstLink =
        ".responsive-table:first-of-type tbody tr:first-of-type td.hauptlink>a";
      await page.waitForSelector(firstLink, { timeout: 60000 });
      await page.click(firstLink);
    }

    await page.waitForSelector(".tm-player-transfer-history-grid", {
      timeout: 60000,
    });

    // Scroll zu Transferhistorie
    await page.evaluate(() => {
      const el = document.querySelector(".tm-player-transfer-history-grid");
      if (el) el.scrollIntoView({ behavior: "auto", block: "center" });
    });
    await sleep(500);

    const allRows = await page.$$eval("div.grid", (nodes: Element[]) =>
      nodes.map((el: Element) => ({
        html: el.outerHTML,
        className: el.className,
      }))
    );

    let currentFlag: boolean | undefined = undefined;
    for (const row of allRows) {
      const isHeading = row.className.includes(
        "tm-player-transfer-history-grid--heading"
      );
      const isFooter = row.className.includes(
        "player-transfer-history__footer-container"
      );

      if (isHeading) {
        const text = row.html.match(/>([^<]+)<\/div>/)?.[1].trim();
        if (text === "Upcoming transfer") currentFlag = true;
        else if (text === "Transfer history") currentFlag = false;
        continue;
      }

      if (isFooter) continue;

      const handle = await page.evaluateHandle((html: string) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        return wrapper.firstElementChild;
      }, row.html);

      const element = handle.asElement();
      if (!element) continue;

      const season = await element
        .$eval(".tm-player-transfer-history-grid__season", (el: Element) =>
          el.textContent?.trim()
        )
        .catch(() => null);

      const date = await element
        .$eval(".tm-player-transfer-history-grid__date", (el: Element) =>
          el.textContent?.trim()
        )
        .catch(() => null);

      const fromClubName = await element
        .$eval(
          ".tm-player-transfer-history-grid__old-club .tm-player-transfer-history-grid__club-link",
          (el: Element) => el.textContent?.trim()
        )
        .catch(() => null);

      const toClubName = await element
        .$eval(
          ".tm-player-transfer-history-grid__new-club .tm-player-transfer-history-grid__club-link",
          (el: Element) => el.textContent?.trim()
        )
        .catch(() => null);

      const feeRaw = await element
        .$eval(".tm-player-transfer-history-grid__fee", (el: Element) =>
          el.textContent?.trim()
        )
        .catch(() => null);

      let transferType: string | undefined = undefined;
      let fee = feeRaw || null;

      if (feeRaw) {
        const lower = feeRaw.toLowerCase();

        if (lower.includes("loan fee")) {
          transferType = "Loan (paid)";
          const numberMatch = feeRaw.match(/\u20ac([\d.,]+)([mk]?)/i);
          if (numberMatch) {
            const amount = parseFloat(numberMatch[1].replace(",", "."));
            const suffix = numberMatch[2]?.toLowerCase();
            const multiplier =
              suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1;
            if (!isNaN(amount)) fee = String(Math.round(amount * multiplier));
          }
        } else if (lower.includes("end of loan")) {
          transferType = "Loan end";
          fee = null;
        } else if (lower.includes("loan")) {
          transferType = "Loan";
          fee = null;
        } else if (feeRaw.startsWith("\u20ac")) {
          const multiplier = feeRaw.includes("m")
            ? 1_000_000
            : feeRaw.includes("k")
            ? 1_000
            : 1;
          const number = parseFloat(
            feeRaw.replace("\u20ac", "").replace("m", "").replace("k", "")
          );
          if (!isNaN(number)) fee = String(Math.round(number * multiplier));
        }
      }

      let from_club_id: number | null = null;
      let to_club_id: number | null = null;

      if (fromClubName) {
        const existing = db
          .prepare("SELECT id FROM clubs WHERE name = ?")
          .get(fromClubName);
        if (existing && typeof existing === "object" && "id" in existing) {
          from_club_id = (existing as { id: number }).id;
        }
      }

      if (toClubName) {
        const existing = db
          .prepare("SELECT id FROM clubs WHERE name = ?")
          .get(toClubName);
        if (existing && typeof existing === "object" && "id" in existing) {
          to_club_id = (existing as { id: number }).id;
        }
      }

      insertTransfer({
        player_id: playerId,
        season: season || undefined,
        transfer_date: date || undefined,
        from_club_id,
        to_club_id,
        fee,
        transfer_type: transferType,
        upcoming: currentFlag ?? false,
      });
    }

    const totalFeeRaw = await page
      .$eval(
        ".grid__footer.tm-player-transfer-history-grid .tm-player-transfer-history-grid__fee",
        (el: Element) => el.textContent?.trim()
      )
      .catch(() => null);

    if (totalFeeRaw && totalFeeRaw.startsWith("\u20ac")) {
      const multiplier = totalFeeRaw.includes("m")
        ? 1_000_000
        : totalFeeRaw.includes("k")
        ? 1_000
        : 1;
      const number = parseFloat(
        totalFeeRaw.replace("\u20ac", "").replace("m", "").replace("k", "")
      );
      const total_fee = !isNaN(number) ? Math.round(number * multiplier) : null;

      if (total_fee !== null) {
        insertTransfer({
          player_id: playerId,
          fee: String(total_fee),
          transfer_type: "total",
        });
      }
    }

    console.log(`✅ Transfers für ${playerName} gespeichert.`);
  } catch (err) {
    console.error(`❌ Fehler bei ${playerName}:`, err);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const players = db
      .prepare("SELECT id, name FROM players")
      .all() as PlayerRow[];

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

    for (const player of players) {
      await scrapeTransfersForPlayer(page, player.id, player.name);
      await sleep(500);
    }

    await browser.close();
  })();
}
