import { createError, defineEventHandler, getQuery } from "h3";
import db from "../db/connection";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default defineEventHandler((event) => {
  const { q, limit } = getQuery(event);
  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return [];
  }

  const safeLimit =
    typeof limit === "string" ? Math.min(Number(limit) || 10, 25) : 10;

  const normalized = normalizeSearch(q);
  if (normalized.length < 2) return [];

  const patternStart = `${normalized}%`;
  const patternWord = `% ${normalized}%`;
  const patternHyphen = `%-${normalized}%`;

  try {
    const rows = db
      .prepare(
        `
        SELECT name
        FROM players
        WHERE
          name_search LIKE ?
          OR name_search LIKE ?
          OR name_search LIKE ?
          OR tm_short_name_search LIKE ?
          OR tm_short_name_search LIKE ?
          OR tm_short_name_search LIKE ?
          OR tm_full_name_search LIKE ?
          OR tm_full_name_search LIKE ?
          OR tm_full_name_search LIKE ?
        ORDER BY name ASC
        LIMIT ?
      `,
      )
      .all(
        patternStart,
        patternWord,
        patternHyphen,
        patternStart,
        patternWord,
        patternHyphen,
        patternStart,
        patternWord,
        patternHyphen,
        safeLimit,
      ) as {
        name: string;
      }[];

    return rows.map((row) => row.name);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Search failed",
    });
  }
});
