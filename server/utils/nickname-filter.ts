/**
 * Nickname Blacklist
 * Uses bad-words-next npm package for comprehensive profanity filtering
 * Supports leetspeak detection, Unicode confusables, and multiple languages
 */

import BadWordsNext from "bad-words-next";
import en from "bad-words-next/lib/en";
import es from "bad-words-next/lib/es";
import fr from "bad-words-next/lib/fr";
import de from "bad-words-next/lib/de";
import ru from "bad-words-next/lib/ru";
import ruLat from "bad-words-next/lib/ru_lat";
import ua from "bad-words-next/lib/ua";
import pl from "bad-words-next/lib/pl";
import ch from "bad-words-next/lib/ch";

// Initialize filter with all available language dictionaries
const filter = new BadWordsNext();
filter.add(en);
filter.add(es);
filter.add(fr);
filter.add(de);
filter.add(ru);
filter.add(ruLat);
filter.add(ua);
filter.add(pl);
filter.add(ch);

/**
 * Check if a nickname contains blacklisted content
 * @param nickname - The nickname to check
 * @returns true if the nickname is clean, false if it contains blocked content
 */
export function isNicknameAllowed(nickname: string): boolean {
  if (!nickname) return true;

  try {
    return !filter.check(nickname);
  } catch {
    // If filter fails for any reason, allow the nickname
    return true;
  }
}

/**
 * Sanitize a nickname by replacing blocked content
 * @param nickname - The nickname to sanitize
 * @returns Sanitized nickname with profanity replaced by placeholder
 */
export function sanitizeNickname(nickname: string): string {
  if (!nickname) return "Player";

  try {
    return filter.filter(nickname);
  } catch {
    return nickname;
  }
}
