/**
 * Film Club Recommendation Engine — Phase 1
 *
 * No ML. No black box. No fake AI.
 * Pure taste signals + community data + quality filtering.
 *
 * Strategy (from product spec):
 *   "Film Club doesn't guess.
 *    It recommends through people who get your taste."
 *
 * Score formula:
 *   genreMatch    × 30  (user's preferred genres match film)
 *   moodMatch     × 25  (tonight's mood matches film category)
 *   clubSignal    × 20  (film is popular in clubs you joined)
 *   communityHeat × 15  (Film Club members logged/rated this week)
 *   tmdbQuality   × 10  (vote_average / 10)
 *   tierBonus     × 15  (S=15, A=8, B=0)
 *   freshness     ×  5  (bonus for last 3 years)
 *   seenPenalty   × 100 (hard exclude)
 */

import { supabase } from "./supabase";
import { getFilmDetails, getTrendingByGenres, MOOD_TO_GENRES } from "./tmdb";

/* ── Types ──────────────────────────────────────────────────── */

export interface CuratedFilm {
  movie_id: number;
  title: string;
  genre_ids: number[];
  release_year: number | null;
  vote_average: number;
  poster_path: string | null;
  overview: string | null;
  category: "easy" | "emotional" | "thriller" | "smart" | "comedy";
  tier: "S" | "A" | "B";
  club_tags: string[];
}

export interface Recommendation extends CuratedFilm {
  score: number;
  reason: string;
  source: "community" | "curated";
}

export type UserAction = "save" | "watched" | "skip" | "perfect_pick" | "good" | "miss";

/* ── Mood → film category mapping ───────────────────────────── */

const MOOD_TO_CATEGORY: Record<string, string[]> = {
  "Comfort":      ["easy", "emotional", "comedy"],
  "Funny":        ["comedy"],
  "Smart":        ["smart"],
  "Thrilling":    ["thriller", "smart"],
  "Romantic":     ["emotional"],
  "Emotional":    ["emotional"],
  "Easy Watch":   ["easy", "comedy"],
  "Mind-Blowing": ["smart", "thriller"],
};

/* ── Club name → film tag fuzzy matching ────────────────────── */

// Maps club identity keywords to movie club_tags
const CLUB_KEYWORD_MAP: Record<string, string[]> = {
  "a24":        ["a24"],
  "arthouse":   ["a24", "artsy"],
  "indie":      ["a24", "artsy"],
  "rom-com":    ["rom-com"],
  "romance":    ["rom-com"],
  "nolan":      ["nolan"],
  "sci-fi":     ["sci-fi", "mind-blowing"],
  "science":    ["sci-fi"],
  "thriller":   ["thriller"],
  "90s":        ["comfort", "thriller"],
  "90":         ["comfort"],
  "international": ["a24", "emotional"],
  "world":      ["emotional", "a24"],
  "comedy":     ["funny", "rom-com"],
  "funny":      ["funny"],
  "horror":     ["thriller"],
  "comfort":    ["comfort", "easy"],
};

function clubMatchesTags(clubName: string, filmTags: string[]): boolean {
  const nameLower = clubName.toLowerCase();
  const tagsLower = filmTags.map((t) => t.toLowerCase());

  // Direct tag match
  if (tagsLower.some((tag) => nameLower.includes(tag))) return true;

  // Keyword map match
  for (const [keyword, mappedTags] of Object.entries(CLUB_KEYWORD_MAP)) {
    if (nameLower.includes(keyword)) {
      if (mappedTags.some((mt) => tagsLower.includes(mt))) return true;
    }
  }
  return false;
}

/* ── Score a single film ─────────────────────────────────────── */

interface ScoreContext {
  profileMoods: string[];
  activeMood: string | null;
  clubNames: string[];
  communityMap: Map<number, { count: number; avgRating: number }>;
}

function scoreFilm(film: CuratedFilm, ctx: ScoreContext): { score: number; reason: string; source: "community" | "curated" } {
  let score = 0;
  const reasons: string[] = [];
  let source: "community" | "curated" = "curated";

  // ── 1. Mood match (25 pts) ───────────────────────────────────
  const mood = ctx.activeMood ?? ctx.profileMoods[0] ?? null;
  if (mood) {
    const targetCats = MOOD_TO_CATEGORY[mood] ?? [];
    if (targetCats.includes(film.category)) {
      score += 25;
      const moodLabel = mood.toLowerCase();
      reasons.push(`Perfect ${moodLabel} pick tonight`);
    }
  } else {
    // No active mood — partial credit if any profile mood matches
    const anyMatch = ctx.profileMoods.some((m) =>
      (MOOD_TO_CATEGORY[m] ?? []).includes(film.category)
    );
    if (anyMatch) score += 12;
  }

  // ── 2. Club signal (20 pts) ──────────────────────────────────
  const matchedClub = ctx.clubNames.find((club) =>
    clubMatchesTags(club, film.club_tags)
  );
  if (matchedClub) {
    score += 20;
    reasons.push(`Loved in ${matchedClub}`);
  }

  // ── 3. Community heat (15 pts) ───────────────────────────────
  const community = ctx.communityMap.get(film.movie_id);
  if (community) {
    source = "community";
    if (community.count >= 5) {
      score += 15;
      reasons.push(`${community.count} Film Club members logged this week`);
    } else if (community.count >= 3) {
      score += 12;
      reasons.push(`${community.count} people in Film Club watched this`);
    } else if (community.count >= 2) {
      score += 8;
      if (community.avgRating >= 8.0) {
        reasons.push(`Rated ${community.avgRating.toFixed(1)} by Film Club members`);
      } else {
        reasons.push(`${community.count} Film Club members are talking about this`);
      }
    } else if (community.avgRating >= 9.0) {
      score += 6;
      reasons.push(`Rated ${community.avgRating.toFixed(1)}/10 by a Film Club member`);
    }
  }

  // ── 4. TMDB quality (10 pts) ─────────────────────────────────
  score += (film.vote_average / 10) * 10;

  // ── 5. Tier bonus (S=15, A=8, B=0) ──────────────────────────
  if (film.tier === "S") score += 15;
  else if (film.tier === "A") score += 8;

  // ── 6. Freshness (5 pts for last 3 years) ───────────────────
  const currentYear = new Date().getFullYear();
  if (film.release_year && film.release_year >= currentYear - 3) score += 5;

  // ── Fallback reason ──────────────────────────────────────────
  if (reasons.length === 0) {
    if (film.vote_average >= 8.5) {
      reasons.push("One of the best films made — trust us on this");
    } else if (film.vote_average >= 8.0) {
      reasons.push("Critically loved · safe great pick tonight");
    } else {
      reasons.push("Quality pick trusted by Film Club");
    }
  }

  return { score, reason: reasons[0], source };
}

/* ── Main fetch function ─────────────────────────────────────── */

export async function fetchRecommendations(opts: {
  userId: string;
  profileMoods: string[];
  activeMood: string | null;
  clubNames: string[];
  topThreeTmdbIds?: number[];
}): Promise<Recommendation[]> {
  const { userId, profileMoods, activeMood, clubNames, topThreeTmdbIds = [] } = opts;

  // 1. Get films already seen or skipped by this user
  const [{ data: logs }, { data: actions }] = await Promise.all([
    supabase.from("film_logs").select("tmdb_id").eq("user_id", userId),
    supabase.from("user_actions").select("movie_id").eq("user_id", userId).in("action", ["watched", "skip"]),
  ]);

  const seenIds = new Set<number>([
    ...(logs ?? []).map((l: Record<string, unknown>) => l.tmdb_id as number),
    ...(actions ?? []).map((a: Record<string, unknown>) => a.movie_id as number),
    ...topThreeTmdbIds, // also exclude onboarding-rated films
  ]);

  // 2. Community heat — films logged anywhere in the last 7 days
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: communityLogs } = await supabase
    .from("film_logs")
    .select("tmdb_id, rating")
    .gte("created_at", weekAgo)
    .not("rating", "is", null);

  const communityMap = new Map<number, { count: number; avgRating: number }>();
  for (const log of communityLogs ?? []) {
    const id = log.tmdb_id as number;
    const existing = communityMap.get(id) ?? { count: 0, avgRating: 0 };
    const newCount = existing.count + 1;
    communityMap.set(id, {
      count: newCount,
      avgRating:
        (existing.avgRating * existing.count + (log.rating as number)) / newCount,
    });
  }

  // 3. Fetch curated pool from Supabase
  //    Quality floor: 6.5 unless it's comedy/horror (doc says lower is OK there)
  const { data: movies, error } = await supabase
    .from("movies")
    .select("*")
    .or("vote_average.gte.6.5,category.eq.comedy");

  if (error || !movies || movies.length === 0) {
    // Fallback: curated pool not seeded yet — pull TMDB trending filtered by mood
    return getTmdbFallback(activeMood ?? profileMoods[0] ?? null, seenIds);
  }

  // 4. Score every unseen film
  const ctx: ScoreContext = { profileMoods, activeMood, clubNames, communityMap };

  const scored = (movies as CuratedFilm[])
    .filter((m) => !seenIds.has(m.movie_id))
    .map((m) => {
      const { score, reason, source } = scoreFilm(m, ctx);
      return { ...m, score, reason, source } as Recommendation;
    })
    .sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, 3);

  // 5. Augment top 3 with TMDB poster + overview (if not already cached)
  const augmented = await Promise.all(
    top3.map(async (film) => {
      if (film.poster_path && film.overview) return film;
      try {
        const details = await getFilmDetails(film.movie_id);
        return {
          ...film,
          poster_path: film.poster_path ?? details.poster_path ?? null,
          overview: film.overview ?? details.overview ?? null,
        };
      } catch {
        return film;
      }
    })
  );

  return augmented;
}

/* ── TMDB fallback when curated pool not yet seeded ─────────── */

async function getTmdbFallback(
  mood: string | null,
  seenIds: Set<number>
): Promise<Recommendation[]> {
  try {
    const genreIds = mood ? (MOOD_TO_GENRES[mood] ?? []) : [];
    const films = await getTrendingByGenres(genreIds);
    const currentYear = new Date().getFullYear();

    return films
      .filter((f) => !seenIds.has(f.id) && f.vote_average >= 6.5)
      .slice(0, 3)
      .map((f) => {
        const releaseYear = f.release_date
          ? parseInt(f.release_date.slice(0, 4))
          : null;
        const isFresh = releaseYear != null && releaseYear >= currentYear - 3;
        return {
          movie_id: f.id,
          title: f.title,
          genre_ids: f.genre_ids,
          release_year: releaseYear,
          vote_average: f.vote_average,
          poster_path: f.poster_path,
          overview: f.overview,
          category: "easy" as const,
          tier: "A" as const,
          club_tags: [],
          score: 50 + (f.vote_average / 10) * 10 + (isFresh ? 5 : 0),
          reason: mood
            ? `Trending ${mood.toLowerCase()} pick right now · ${f.vote_average.toFixed(1)} ★`
            : `Trending this week · ${f.vote_average.toFixed(1)} ★`,
          source: "curated" as const,
        };
      });
  } catch {
    return [];
  }
}

/* ── Log a user action ───────────────────────────────────────── */

export async function logUserAction(
  userId: string,
  movieId: number,
  action: UserAction
): Promise<void> {
  // Remove any previous conflicting action for this movie
  // (e.g. if they previously skipped but now want to save)
  const conflictingActions: UserAction[] = action === "save"
    ? ["skip"]
    : action === "skip"
    ? ["save"]
    : [];

  if (conflictingActions.length > 0) {
    await supabase
      .from("user_actions")
      .delete()
      .eq("user_id", userId)
      .eq("movie_id", movieId)
      .in("action", conflictingActions);
  }

  await supabase.from("user_actions").insert({
    user_id: userId,
    movie_id: movieId,
    action,
  });
}
