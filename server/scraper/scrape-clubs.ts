// 📁 server/scraper/scrape-club.ts
import { ElementHandle, Page } from "puppeteer";
import db from "../db/connection";
import { upsertClub } from "../db/insert";
import path from "path";
import fs from "fs";

export async function scrapeAndUpsertClubFromRow(
  element: ElementHandle<Element>,
  selector: string,
  page: Page
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
      (el) => el.textContent?.trim() ?? null
    );
    const clubHref = await clubAnchor.evaluate((el) => el.getAttribute("href"));
    const logoSrc = await clubLogo.evaluate(
      (el) =>
        el.getAttribute("srcset")?.split(",")[0]?.split(" ")[0] ??
        el.getAttribute("src")
    );

    if (!clubName || !clubHref) return null;

    const idMatch = clubHref.match(/verein\/(\d+)/);
    const clubId = idMatch ? parseInt(idMatch[1]) : null;
    if (!clubId) return null;

    const exists = db.prepare("SELECT 1 FROM clubs WHERE id = ?").get(clubId);
    if (exists) return clubId;

    // Save logo
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
