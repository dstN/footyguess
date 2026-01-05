/**
 * Player Loader
 * Loads player list from file or environment
 */

import fs from "fs";
import path from "path";

/**
 * Load list of player names to scrape
 * Priority: REQUESTED_URLS env var > all_players.json file
 */
export function loadPlayers(): string[] {
  const requestedUrls = process.env.REQUESTED_URLS;

  if (requestedUrls) {
    try {
      return JSON.parse(requestedUrls) as string[];
    } catch (err) {
      console.warn("Failed to parse REQUESTED_URLS, falling back to file");
    }
  }

  try {
    const content = fs.readFileSync(path.resolve("all_players.json"), "utf8");
    const players = JSON.parse(content) as Array<{ name: string }>;
    return players.map((p) => p.name);
  } catch (err) {
    console.error("Failed to load players from all_players.json");
    throw err;
  }
}
