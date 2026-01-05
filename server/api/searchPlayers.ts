import { createError, defineEventHandler, getQuery } from "h3";
import db from "../db/connection.ts";
import { parseSchema } from "../utils/validate.ts";
import { logError } from "../utils/logger.ts";
import { object, optional, string, minLength, maxLength, pipe } from "valibot";

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
  const query = getQuery(event);
  const parsed = parseSchema(
    object({
      q: optional(pipe(string(), minLength(2), maxLength(64))),
      limit: optional(string()),
    }),
    query,
  );
  if (!parsed.ok) {
    return [];
  }

  const q = parsed.data.q;
  const limit = parsed.data.limit;
  if (!q || q.trim().length < 2) {
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
    logError("searchPlayers error", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Search failed",
    });
  }
});
