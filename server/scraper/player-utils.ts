/**
 * Player Data Parser
 * Handles name normalization and slug conversion
 */

/**
 * Convert slug to titleized name format
 * Example: "cristiano-ronaldo" -> "Cristiano Ronaldo"
 */
export function titleizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/**
 * Extract player name from URL path
 */
export function extractPlayerName(path: string): string {
  const slug = path.split("/").pop() ?? "";
  return titleizeSlug(slug);
}

/**
 * Normalize player name for database storage
 */
export function normalizePlayerName(name: string): string {
  return name.trim();
}
