// 📁 server/scraper/scrape-career-stats.ts
import puppeteer, { Page } from "puppeteer";
import db from "../db/connection";
import path from "path";
import fs from "fs";
import {
  upsertCompetition,
  upsertPlayerStats,
  updateTotalStatsForPlayer,
} from "../db/insert";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface PlayerRow {
  id: number;
  name: string;
}

async function extractFilenameFromUrl(url: string) {
  const match = url.match(/\/([^\/?#]+)\.png/i);
  return match ? match[1] : null;
}

async function downloadImage(
  url: string,
  filename: string
): Promise<string | null> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https:${url}`;
    const competition_id = await extractFilenameFromUrl(fullUrl);
    const safeName = filename
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    const localPath = `/assets/competitions/${safeName}-${competition_id}.png`;
    const outputDir = path.resolve("public/assets/competitions");
    const fullPath = path.join(outputDir, `${safeName}-${competition_id}.png`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(fullPath)) {
      const res = await fetch(fullUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(fullPath, Buffer.from(buffer));
      }
    }
    return localPath;
  } catch (err) {
    console.error("Fehler beim Laden des Competition-Logos:", err);
    return null;
  }
}

export async function scrapeCareerStatsForPlayer(
  page: Page,
  playerId: number,
  playerName: string
) {
  try {
    const currentUrl = page.url();
    const parts = currentUrl.split("/");
    const slug = parts[3];
    const id = parts.at(-1);
    const statsUrl = `https://www.transfermarkt.com/${slug}/leistungsdaten/spieler/${id}/saison/ges/plus/1`;

    await page.goto(statsUrl, { waitUntil: "networkidle2", timeout: 0 });
    console.log(`➡️  Stats werden geladen für ${playerName}: ${statsUrl}`);

    const rows = await page.$$(".responsive-table .items tbody > tr");
    for (const row of rows) {
      const cells = await row.$$("td");
      if (cells.length < 14) continue;

      const logoImg = await cells[0].$("img");
      const logoUrl = logoImg
        ? await logoImg.evaluate((el) => el.getAttribute("src"))
        : null;

      const nameAnchor = await cells[1].$("a");
      const competitionName = nameAnchor
        ? await nameAnchor.evaluate((el) => el.textContent?.trim() || "")
        : "";

      const competitionIdMatch = nameAnchor
        ? await nameAnchor.evaluate((el) => {
            const href = el.getAttribute("href") || "";
            const match = href.match(/wettbewerb\/(\w+)/);
            return match?.[1] || null;
          })
        : null;

      if (!competitionIdMatch || !competitionName) continue;

      const logo_path = logoUrl
        ? await downloadImage(logoUrl, competitionName)
        : null;

      upsertCompetition({
        id: competitionIdMatch,
        name: competitionName,
        logo_path: logo_path,
      });

      const text = await Promise.all(
        cells.map((cell) => cell.evaluate((el) => el.textContent?.trim() || ""))
      );

      const appearances = parseInt(text[2]) || 0;
      const goals = parseInt(text[3]) || 0;
      const assists = parseInt(text[4]) || 0;
      const ownGoals = parseInt(text[5]) || 0;
      const subbedOn = parseInt(text[6]) || 0;
      const subbedOff = parseInt(text[7]) || 0;
      const yellowCards = parseInt(text[8]) || 0;
      const yellowRedCards = parseInt(text[9]) || 0;
      const redCards = parseInt(text[10]) || 0;
      const penalties = parseInt(text[11]) || 0;
      const minutesPlayed =
        parseInt(text[13].replace("'", "").replace(/\./g, "")) || 0;

      const averageMinutesPerMatch =
        appearances > 0 ? Math.round(minutesPlayed / appearances) : 0;

      upsertPlayerStats({
        player_id: playerId,
        competition_id: competitionIdMatch,
        appearances,
        goals,
        assists,
        own_goals: ownGoals,
        subbed_on: subbedOn,
        subbed_off: subbedOff,
        yellow_cards: yellowCards,
        yellow_red_cards: yellowRedCards,
        red_cards: redCards,
        penalties,
        minutes_played: minutesPlayed,
        average_minutes_per_match: averageMinutesPerMatch,
      });
    }

    const totalCells = await page.$$eval(
      ".responsive-table .items tfoot td",
      (cells) => cells.map((td) => td.textContent?.trim() || "")
    );

    if (totalCells.length >= 14) {
      const parseSafe = (value: string) =>
        value === "-"
          ? 0
          : parseInt(value.replace("'", "").replace(/\./g, "")) || 0;

      const appearances = parseSafe(totalCells[2]);
      const goals = parseSafe(totalCells[3]);
      const assists = parseSafe(totalCells[4]);
      const own_goals = parseSafe(totalCells[5]);
      const subbed_on = parseSafe(totalCells[6]);
      const subbed_off = parseSafe(totalCells[7]);
      const yellow_cards = parseSafe(totalCells[8]);
      const yellow_red_cards = parseSafe(totalCells[9]);
      const red_cards = parseSafe(totalCells[10]);
      const penalties = parseSafe(totalCells[11]);
      const avg_minutes_per_goal = parseSafe(totalCells[12]);
      const minutes_played = parseSafe(totalCells[13]);
      const avg_minutes_per_match =
        appearances > 0 ? Math.round(minutes_played / appearances) : 0;

      const totalStats = {
        appearances,
        goals,
        assists,
        own_goals,
        subbed_on,
        subbed_off,
        yellow_cards,
        yellow_red_cards,
        red_cards,
        penalties,
        avg_minutes_per_goal,
        minutes_played,
        avg_minutes_per_match,
      };

      updateTotalStatsForPlayer(playerId, JSON.stringify(totalStats));
    }
  } catch (err) {
    console.error(`❌ Fehler beim Laden der Stats für ${playerName}:`, err);
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
      await scrapeCareerStatsForPlayer(page, player.id, player.name);
      await sleep(500);
    }

    await browser.close();
  })();
}
