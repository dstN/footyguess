export interface Player {
  id: number;
  name: string;
  birthdate: string | null;
  birthplace: string;
  height_cm: number | null;
  foot: string | null;
  shirt_number: number | null;
  main_position: string;
  secondary_positions: string[];
  nationalities: string[];
  active: number | null;
  retired_since: string | null;
  total_stats: Record<string, number | string> | null;
  current_club_id: number | null;
  currentClub: string | null;
  clubLogo: string | null;
  transfers: any[]; // kannst du später noch genauer typisieren
  stats: any[]; // kannst du später noch genauer typisieren
}
