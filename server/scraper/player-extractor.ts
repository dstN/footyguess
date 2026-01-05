/**
 * Player Data Extractor
 * Handles DOM parsing and player information extraction from TransferMarkt
 */

import type { Page } from "puppeteer";

export interface PlayerPageData {
  tmId: number | null;
  tmShortSlug: string | null;
  tmShortName: string | null;
  displayName: string;
  headlineName: string | null;
  fullName: string | null;
  shortName: string | null;
  shirtNumber: number | null;
  birthplace: string;
  nationalities: string[];
  birthdate: string | null;
  heightCm: number | null;
  foot: string | null;
  active: boolean;
  retiredSince: string | null;
}

/**
 * Extract player data from TransferMarkt page
 */
export async function extractPlayerPageData(
  page: Page,
): Promise<PlayerPageData> {
  const profileUrl = page.url();
  const urlMatch = profileUrl.match(
    /transfermarkt\.com\/([^\/]+)\/profil\/spieler\/(\d+)/i,
  );

  const tmShortSlug = urlMatch?.[1] ?? null;
  const tmId = urlMatch?.[2] ? Number.parseInt(urlMatch[2], 10) : null;

  const shirtNumber = await page.evaluate(() => {
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
      .map((part) => {
        const matches = part.match(/title="([^"]+)"/);
        return matches?.[1] || null;
      })
      .filter((v): v is string => v !== null);
  });

  const heightCm = await page.evaluate(() => {
    const label = Array.from(
      document.querySelectorAll("span.info-table__content--regular"),
    ).find((el) => el.textContent?.trim() === "Height:");
    const value = label?.nextElementSibling?.textContent?.trim() ?? null;
    if (!value) return null;
    const match = value.match(/(\d+,\d{2})/);
    if (!match) return null;
    return Math.round(Number.parseFloat(match[1].replace(",", ".")) * 100);
  });

  const active: boolean = await page.evaluate(() => {
    const box = document.querySelector("div.data-header__box--big");
    if (!box) return true;
    const club = box
      .querySelector("span.data-header__club")
      ?.textContent?.trim();
    const alt = box.querySelector("img[alt]")?.getAttribute("alt")?.trim();
    return !(club === "Retired" || alt === "Retired");
  });

  let retiredSince: string | null = null;
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
      retiredSince = Number.isNaN(parsed.getTime())
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

  const tmShortName = tmShortSlug
    ? tmShortSlug
        .split("-")
        .map((part) =>
          part.length ? part[0].toUpperCase() + part.slice(1) : part,
        )
        .join(" ")
    : null;

  const displayName = shortName || headlineName || tmShortName || "";

  // Extract birth date from link
  let birthdate: string | null = null;
  const birthHref = await page.evaluate(() => {
    const label = Array.from(
      document.querySelectorAll("span.info-table__content--regular"),
    ).find((el) => el.textContent?.trim() === "Date of birth:");
    return (label?.nextElementSibling as HTMLAnchorElement)?.getAttribute(
      "href",
    );
  });
  if (birthHref) {
    birthdate = birthHref.split("/").pop() ?? null;
  }

  return {
    tmId,
    tmShortSlug,
    tmShortName,
    displayName,
    headlineName,
    fullName,
    shortName,
    shirtNumber,
    birthplace,
    nationalities,
    birthdate,
    heightCm,
    foot,
    active,
    retiredSince,
  };
}
