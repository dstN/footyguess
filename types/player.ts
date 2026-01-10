/**
 * Difficulty tier levels
 */
export type DifficultyTier = "easy" | "medium" | "hard" | "ultra";

/**
 * Difficulty information for a player
 */
export interface DifficultyInfo {
  tier: DifficultyTier;
  multiplier: number;
  basePoints: number;
  cluePenalty?: number;
}

export interface Transfer {
  season?: string;
  transfer_date?: string;
  fee?: string;
  transfer_type?: string;
  upcoming?: number;
  from_club_id?: number;
  from_club?: string;
  to_club_id?: number;
  to_club?: string;
}

export interface PlayerStats {
  competition_id: string;
  competition?: string;
  appearances: number;
  goals?: number;
  assists?: number;
  own_goals?: number;
  subbed_on?: number;
  subbed_off?: number;
  yellow_cards?: number;
  yellow_red_cards?: number;
  red_cards?: number;
  penalties?: number;
  minutes_played?: number;
  average_minutes_per_match?: number;
}

export interface Player {
  id: number;
  name: string;
  birthdate: string | null;
  birthplace: string;
  height_cm: number | null;
  foot: string | null;
  shirt_number: number | null;
  tm_id?: number | null;
  tm_url?: string | null;
  tm_short_name?: string | null;
  tm_full_name?: string | null;
  main_position: string;
  secondary_positions: string[];
  nationalities: string[];
  active: number | null;
  retired_since: string | null;
  total_stats: Record<string, number | string> | null;
  current_club_id: number | null;
  currentClub: string | null;
  transfers: Transfer[];
  stats: PlayerStats[];
  difficulty?: DifficultyInfo & {
    basis: "international" | "top5";
    totalAppearances: number;
  };
}

/**
 * Score breakdown from a single round
 * Used for display in won.vue and score components
 */
export interface RoundScoreInfo {
  score: number;
  baseScore: number;
  cluesUsed: number;
  streak: number;
  streakBonus: number;
  timeMultiplier: number;
  malicePenalty: number;
  playerName: string | null;
  playerTmUrl: string | null;
}
