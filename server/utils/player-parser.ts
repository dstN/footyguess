import type { Player } from "~/types/player";

/**
 * Parses and deserializes player data from database records.
 * Handles JSON string fields that may be stored as JSON in the database.
 *
 * @param player - Raw player data from database query
 * @returns Parsed player object with deserialized fields
 *
 * @example
 * const rawPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(1);
 * const player = parsePlayerData(rawPlayer as any);
 */
export function parsePlayerData(player: any): Player {
  if (!player) return player;

  return {
    ...player,
    secondary_positions: parseIfString(player.secondary_positions),
    nationalities: parseIfString(player.nationalities),
    total_stats: parseIfString(player.total_stats),
  };
}

/**
 * Safely parses a JSON string if the value is a string, otherwise returns as-is.
 * Silently handles parse errors by returning an empty array.
 *
 * @param value - Value that may be a JSON string or already parsed
 * @returns Parsed array or the original value
 *
 * @example
 * parseIfString('["a", "b"]')  // => ['a', 'b']
 * parseIfString(['a', 'b'])    // => ['a', 'b']
 * parseIfString(null)          // => null
 */
function parseIfString(value: any): any {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    // Return empty array if parse fails
    return Array.isArray(value) ? value : [];
  }
}
