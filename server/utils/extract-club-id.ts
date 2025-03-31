// server/utils/find-club-ids.ts
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const clubsPath = path.resolve("teams.json");
const outputPath = path.resolve("teamIDs.json");

interface ClubList {
  teams: string[];
}

interface WikidataSearchResult {
  search?: { id: string; label: string }[];
}

async function findWikidataID(
  club: string
): Promise<{ id: string; label: string } | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    club
  )}&language=en&format=json&type=item&limit=1`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Fehler bei API für ${club}`);
    return null;
  }

  const json = (await res.json()) as WikidataSearchResult;
  const result = json.search?.[0];

  if (result) {
    return { id: result.id, label: result.label };
  } else {
    console.warn(`⚠️ Kein Treffer für ${club}`);
    return null;
  }
}

export async function buildClubIDMap() {
  const raw = fs.readFileSync(clubsPath, "utf-8");
  const { teams }: ClubList = JSON.parse(raw);

  const map: Record<string, string> = {};

  for (const club of teams) {
    const result = await findWikidataID(club);
    if (result) {
      console.log(`✅ ${club} → ${result.id} (${result.label})`);
      map[club] = result.id;
    } else {
      map[club] = "NOT_FOUND";
    }
    await new Promise((r) => setTimeout(r, 200)); // rate limiting
  }

  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));
  console.log("📁 Mapping gespeichert in:", outputPath);
}

// Direkt ausführen wenn standalone
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  buildClubIDMap();
}
