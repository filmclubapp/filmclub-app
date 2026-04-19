import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---- Types matching our DB schema ---- */

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  favourite_film_tmdb_id: number | null;
  top_three_tmdb_ids: number[];
  taste_tribe?: string | null;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  tagline: string;
  category: string;
  cover_tmdb_backdrop: string | null;
  accent_gradient: string;
  created_by: string;
  is_seeded: boolean;
  created_at: string;
  member_count?: number;
}

export interface ClubMembership {
  club_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface FilmLog {
  id: string;
  user_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  rating: number | null;
  review_text: string | null;
  is_rewatch: boolean;
  has_spoilers: boolean;
  watched_date: string;
  genre_ids: number[];
  release_year: number | null;
  created_at: string;
}

export interface ClubPost {
  id: string;
  club_id: string;
  user_id: string;
  log_id: string | null;
  body: string | null;
  created_at: string;
  // joined
  profiles?: Profile;
  film_logs?: FilmLog;
}
