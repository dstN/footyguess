import { createError, defineEventHandler, getQuery } from "h3";
import db from "../db/connection";

export default defineEventHandler((event) => {
  const { q, limit } = getQuery(event);
  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return [];
  }

  const safeLimit =
    typeof limit === "string" ? Math.min(Number(limit) || 10, 25) : 10;

  const patternStart = `${q}%`;
  const patternWord = `% ${q}%`;
  const patternHyphen = `%-${q}%`;

  try {
    const rows = db
      .prepare(
        `
        SELECT name
        FROM players
        WHERE
          name LIKE ? COLLATE NOCASE
          OR name LIKE ? COLLATE NOCASE
          OR name LIKE ? COLLATE NOCASE
        ORDER BY name ASC
        LIMIT ?
      `,
      )
      .all(patternStart, patternWord, patternHyphen, safeLimit) as {
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
