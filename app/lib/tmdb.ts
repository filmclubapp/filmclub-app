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
