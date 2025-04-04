// 📁 server/scraper/scrape-transfers.ts
import puppeteer, { Page, ElementHandle } from "puppeteer";
import db from "../db/connection";
import { upsertClub, updatePlayerWorth } from "../db/insert";
import path from "path";
import fs from "fs";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface PlayerRow {
  id: number;
  name: string;
}

function parseDateToISO(dateStr: string): string | null {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
}

async function scrapeAndUpsertClubFromRow(
  element: ElementHandle<Element>,
  selector: string
): Promise<number | null> {
  try {
    const clubAnchor = await element.$(
      `${selector} .tm-player-transfer-history-grid__club-link`
    );
    const clubLogo = await element.$(
      `${selector} .tm-player-transfer-history-grid__club-logo`
    );

    if (!clubAnchor || !clubLogo) return null;

    const clubName = await clubAnchor.evaluate(
      (el) => (el as HTMLElement).textContent?.trim() ?? null
    );
    const clubHref = await clubAnchor.evaluate((el) =>
      (el as HTMLElement).getAttribute("href")
    );
    const logoSrc = await clubLogo.evaluate(
      (el) =>
        (el as HTMLElement)
          .getAttribute("srcset")
          ?.split(",")[0]
          ?.split(" ")[0] ?? (el as HTMLElement).getAttribute("src")
    );

    if (!clubName || !clubHref) return null;

    const idMatch = clubHref.match(/verein\/(\d+)/);
    const clubId = idMatch ? parseInt(idMatch[1]) : null;
    if (!clubId) return null;

    const exists = db.prepare("SELECT 1 FROM clubs WHERE id = ?").get(clubId);
    if (exists) return clubId;

    let finalLogoPath: string | null = null;
    if (logoSrc) {
      const safeLogoUrl = logoSrc.startsWith("http")
        ? logoSrc
        : `https:${logoSrc}`;
      const safeName = clubName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
      const filename = `${safeName}.png`;
      const logoPath = `/assets/logos/${filename}`;
      const logoDir = path.resolve("public/assets/logos");
      const fullPath = path.join(logoDir, filename);

      if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
      if (!fs.existsSync(fullPath)) {
        const res = await fetch(safeLogoUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          fs.writeFileSync(fullPath, Buffer.from(buffer));
        }
      }

      finalLogoPath = logoPath;
    }

    upsertClub(clubId, clubName, finalLogoPath);
    return clubId;
  } catch (err) {
    console.error("❌ Fehler beim Scrapen des Clubs:", err);
    return null;
  }
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

    await page.evaluate(() => {
      const el = document.querySelector(".tm-player-transfer-history-grid");
      if (el) el.scrollIntoView({ behavior: "auto", block: "center" });
    });
    await sleep(500);

    const allRows = await page.$$eval("div.grid, div.grid-container", (nodes) =>
      nodes.map((el) => ({
        html: el.outerHTML,
        className: el.className,
      }))
    );

    for (const row of allRows) {
      const isHeading =
        row.className.includes("tm-player-transfer-history-grid--heading") ||
        row.className.includes("grid-container");
      if (isHeading) continue;

      const isFooter = row.className.includes(
        "player-transfer-history__footer-container"
      );
      if (isFooter) continue;

      const handle = await page.evaluateHandle((html: string) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        return wrapper.firstElementChild as Element;
      }, row.html);

      const element = handle.asElement() as ElementHandle<Element>;
      if (!element) continue;

      const season = await element
        .$eval(".tm-player-transfer-history-grid__season", (el) =>
          el.textContent?.trim()
        )
        .catch(() => null);
      const dateRaw = await element
        .$eval(".tm-player-transfer-history-grid__date", (el) =>
          el.textContent?.trim()
        )
        .catch(() => null);
      const transfer_date = dateRaw ? parseDateToISO(dateRaw) : null;
      const upcoming = transfer_date
        ? new Date(transfer_date) > new Date()
        : null;

      const feeRaw = await element
        .$eval(".tm-player-transfer-history-grid__fee", (el) =>
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

      const from_club_id = await scrapeAndUpsertClubFromRow(
        element,
        ".tm-player-transfer-history-grid__old-club"
      );
      const to_club_id = await scrapeAndUpsertClubFromRow(
        element,
        ".tm-player-transfer-history-grid__new-club"
      );

      if (!season && !transfer_date && !fee && !from_club_id && !to_club_id)
        continue;

      db.prepare(
        `INSERT INTO transfers (
          player_id, season, transfer_date, from_club_id, to_club_id, fee, transfer_type, upcoming
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id, transfer_date) DO UPDATE SET
          season = excluded.season,
          from_club_id = excluded.from_club_id,
          to_club_id = excluded.to_club_id,
          fee = excluded.fee,
          transfer_type = excluded.transfer_type,
          upcoming = excluded.upcoming`
      ).run(
        playerId,
        season ?? null,
        transfer_date ?? null,
        from_club_id ?? null,
        to_club_id ?? null,
        fee ?? null,
        transferType ?? null,
        upcoming === null ? null : Number(upcoming)
      );
    }

    const totalFeeRaw = await page
      .$eval(
        ".player-transfer-history__footer-container .tm-player-transfer-history-grid__fee",
        (el: Element) => el.textContent?.trim()
      )
      .catch(() => null);

    let totalFee = 0;
    if (totalFeeRaw && totalFeeRaw.startsWith("\u20ac")) {
      const multiplier = totalFeeRaw.includes("m")
        ? 1_000_000
        : totalFeeRaw.includes("k")
        ? 1_000
        : 1;
      const number = parseFloat(
        totalFeeRaw.replace("\u20ac", "").replace("m", "").replace("k", "")
      );
      if (!isNaN(number)) totalFee = Math.round(number * multiplier);
    }

    updatePlayerWorth(playerId, totalFee);
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
