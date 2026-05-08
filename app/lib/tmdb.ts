const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TMDBFilm {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  runtime?: number;
}

export interface TMDBFilmDetails extends TMDBFilm {
  runtime: number;
  genres: { id: number; name: string }[];
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
    crew: { id: number; name: string; job: string }[];
  };
}

// Search films by title
export async function searchFilms(query: string): Promise<TMDBFilm[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
  );
  const data = await res.json();
  return data.results || [];
}

// Get full film details
export async function getFilmDetails(filmId: number): Promise<TMDBFilmDetails> {
  const res = await fetch(
    `${TMDB_BASE_URL}/movie/${filmId}?api_key=${TMDB_API_KEY}&append_to_response=credits`
  );
  return res.json();
}

// Get trending films (for discovery feed)
export async function getTrending(): Promise<TMDBFilm[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`
  );
  const data = await res.json();
  return data.results || [];
}

// Mood → TMDB genre ID mapping (used by Tonight For You)
export const MOOD_TO_GENRES: Record<string, number[]> = {
  "Comfort":      [18, 10751, 10749],
  "Smart":        [18, 53, 99, 9648],
  "Funny":        [35],
  "Thrilling":    [53, 28, 27],
  "Romantic":     [10749, 35],
  "Emotional":    [18, 10402],
  "Easy Watch":   [35, 28, 16],
  "Mind-Blowing": [878, 53, 14],
};

// Get trending films sorted by how well they match the given genre IDs
export async function getTrendingByGenres(genreIds: number[]): Promise<TMDBFilm[]> {
  const trending = await getTrending();
  if (genreIds.length === 0) return trending;
  const scored = trending.map((film) => ({
    film,
    score: (film.genre_ids ?? []).filter((g: number) => genreIds.includes(g)).length,
  }));
  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const unmatched = scored.filter((s) => s.score === 0);
  return [...matched, ...unmatched].map((s) => s.film);
}

// Watch providers for a film — GB region preferred, falls back to US
export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export async function getWatchProviders(filmId: number): Promise<WatchProvider[]> {
  if (!TMDB_API_KEY) return [];
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/${filmId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    const data = await res.json();
    const region = data.results?.GB ?? data.results?.US ?? {};
    const providers = [
      ...(region.flatrate ?? []),
      ...(region.rent ?? []),
      ...(region.buy ?? []),
    ];
    const seen = new Set<number>();
    return providers
      .filter((p: WatchProvider) => {
        if (seen.has(p.provider_id)) return false;
        seen.add(p.provider_id);
        return true;
      })
      .slice(0, 4);
  } catch {
    return [];
  }
}

// Image URL helpers
export function posterURL(path: string | null, size: "w185" | "w342" | "w500" | "w780" | "original" = "w500"): string {
  if (!path) return "/placeholder-poster.png";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropURL(path: string | null, size: "w780" | "w1280" | "original" = "w1280"): string {
  if (!path) return "/placeholder-backdrop.png";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// Get director from credits
export function getDirector(credits?: TMDBFilmDetails["credits"]): string {
  if (!credits) return "Unknown";
  const director = credits.crew.find((c) => c.job === "Director");
  return director?.name || "Unknown";
}

// Discover films with flexible filters (used by Discover page)
export async function discoverFilms(params: {
  genres?: number[];
  sortBy?: string;
  maxRuntime?: number;
  minVoteCount?: number;
  maxVoteCount?: number;
  minRating?: number;
  page?: number;
}): Promise<TMDBFilm[]> {
  if (!TMDB_API_KEY) return [];
  const p = new URLSearchParams({
    api_key: TMDB_API_KEY,
    sort_by: params.sortBy ?? "vote_average.desc",
    "vote_average.gte": String(params.minRating ?? 6.5),
    include_adult: "false",
    language: "en-US",
    page: String(params.page ?? 1),
  });
  if (params.genres?.length) p.set("with_genres", params.genres.join(","));
  if (params.minVoteCount) p.set("vote_count.gte", String(params.minVoteCount));
  if (params.maxVoteCount) p.set("vote_count.lte", String(params.maxVoteCount));
  if (params.maxRuntime) p.set("with_runtime.lte", String(params.maxRuntime));
  try {
    const res = await fetch(`${TMDB_BASE_URL}/discover/movie?${p}`);
    const data = await res.json();
    return (data.results ?? []).slice(0, 12) as TMDBFilm[];
  } catch {
    return [];
  }
}
