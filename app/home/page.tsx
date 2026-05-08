"use client";

/* ============================================================
   HOME — 2-tab layout
   TRENDING tab: Film Club recommendation engine (curated + community)
   CLUBS tab:    Your Clubs Tonight (live engagement feed)
   ============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import { posterURL } from "../lib/tmdb";
import { useMyClubs, useUserLogs, computeStreak, streakNudgeState, useLikePost } from "../lib/hooks";
import {
  fetchRecommendations,
  logUserAction,
  type Recommendation,
  type UserAction,
} from "../lib/recommendations";
import NotificationBell from "../components/NotificationBell";
import DailyPromptCard from "../components/DailyPromptCard";
import TasteTribeCard from "../components/TasteTribeCard";
import InviteUnlockCard from "../components/InviteUnlockCard";
import SundayRevealBanner from "../components/SundayRevealBanner";
import type { ClubPost, Profile, FilmLog } from "../lib/supabase";

const BG = "#1E1D2B";
const SURFACE = "#252436";
const RED = "#FF4A4A";

type HomeTab = "trending" | "clubs";

/* ── Nav icons ──────────────────────────────────────────────── */
function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconDiscover() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  );
}
function IconClubs() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="15" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 16c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0" />
    </svg>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function engagementScore(post: { likes_count?: number; created_at: string }): number {
  const likesScore = (post.likes_count ?? 0) * 2;
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3600000;
  return likesScore + Math.max(0, 100 - ageHours * 20);
}

/* ── Film of the Week (community-voted) ─────────────────────── */
interface FilmOfWeek {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  avg_rating: number;
  log_count: number;
}

function useFilmOfTheWeek() {
  const [film, setFilm] = useState<FilmOfWeek | null>(null);
  useEffect(() => {
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: logs } = await supabase
        .from("film_logs")
        .select("tmdb_id, title, poster_path, rating")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!logs || logs.length === 0) return;
      const groups = new Map<number, { title: string; poster_path: string | null; ratings: number[] }>();
      for (const l of logs) {
        if (!groups.has(l.tmdb_id)) groups.set(l.tmdb_id, { title: l.title, poster_path: l.poster_path, ratings: [] });
        if (l.rating) groups.get(l.tmdb_id)!.ratings.push(l.rating);
      }
      const sorted = [...groups.entries()]
        .map(([tmdb_id, g]) => ({
          tmdb_id, title: g.title, poster_path: g.poster_path,
          log_count: g.ratings.length || 1,
          avg_rating: g.ratings.length > 0 ? g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length : 0,
        }))
        .sort((a, b) => b.log_count - a.log_count || b.avg_rating - a.avg_rating);
      setFilm(sorted[0] ?? null);
    })();
  }, []);
  return film;
}

/* ── Mood options strip ─────────────────────────────────────── */
const MOOD_OPTIONS = [
  { id: "Comfort",      emoji: "🪦" },
  { id: "Funny",        emoji: "😂" },
  { id: "Smart",        emoji: "🧠" },
  { id: "Thrilling",    emoji: "⚡" },
  { id: "Romantic",     emoji: "❤️" },
  { id: "Emotional",    emoji: "😢" },
  { id: "Easy Watch",   emoji: "🛋️" },
  { id: "Mind-Blowing", emoji: "🤯" },
] as const;

/* ── Recommendation hook ────────────────────────────────────── */
function useRecommendations(
  user: { id: string } | null,
  profile: Profile | null,
  clubs: { id: string; name: string }[]
) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);

  const load = useCallback(
    async (mood: string | null) => {
      if (!user?.id) { setLoading(false); return; }
      setLoading(true);
      try {
        const result = await fetchRecommendations({
          userId: user.id,
          profileMoods: profile?.moods ?? [],
          activeMood: mood,
          clubNames: clubs.map((c) => c.name),
          topThreeTmdbIds: profile?.top_three_tmdb_ids ?? [],
        });
        setRecs(result);
        setCardIndex(0);
      } catch {
        setRecs([]);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, profile, clubs]
  );

  useEffect(() => { load(null); }, [load]);

  const filterByMood = useCallback((mood: string | null) => {
    setActiveMood(mood);
    load(mood);
  }, [load]);

  const skipCurrent = useCallback(
    async (movieId: number) => {
      if (user?.id) await logUserAction(user.id, movieId, "skip");
      // Remove skipped card and reload
      setRecs((prev) => prev.filter((r) => r.movie_id !== movieId));
    },
    [user?.id]
  );

  const saveFilm = useCallback(
    async (movieId: number) => {
      if (user?.id) await logUserAction(user.id, movieId, "save");
    },
    [user?.id]
  );

  const markWatched = useCallback(
    async (movieId: number) => {
      if (user?.id) await logUserAction(user.id, movieId, "watched");
      setRecs((prev) => prev.filter((r) => r.movie_id !== movieId));
    },
    [user?.id]
  );

  const film = recs[cardIndex] ?? null;
  const hasPrev = cardIndex > 0;
  const hasNext = cardIndex < recs.length - 1;

  return {
    film, recs, loading, activeMood, cardIndex,
    hasPrev, hasNext,
    setCardIndex,
    filterByMood,
    skipCurrent,
    saveFilm,
    markWatched,
  };
}

/* ── Home feed hook ─────────────────────────────────────────── */
function useHomeFeed(clubIds: string[]) {
  const [posts, setPosts] = useState<(ClubPost & { club_name?: string; likes_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    if (clubIds.length === 0) { setLoading(false); return; }
    const { data } = await supabase
      .from("club_posts")
      .select("*, profiles(*), film_logs(*), clubs(name)")
      .in("club_id", clubIds)
      .order("created_at", { ascending: false })
      .limit(50);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withClubName = (data ?? []).map((p: any) => ({
      ...p,
      club_name: p.clubs?.name ?? "",
    })) as (ClubPost & { club_name?: string; likes_count?: number })[];
    withClubName.sort((a, b) => engagementScore(b) - engagementScore(a));
    setPosts(withClubName.slice(0, 20));
    setLoading(false);
  }, [clubIds]);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") loadFeed();
    });
    return () => subscription.unsubscribe();
  }, [loadFeed]);

  return { posts, loading, refresh: loadFeed };
}

/* ================================================================
   TONIGHT FOR YOU — Recommendation engine UI
   ================================================================ */
function TonightForYouSection({
  user,
  profile,
  clubs,
}: {
  user: { id: string } | null;
  profile: Profile | null;
  clubs: { id: string; name: string }[];
}) {
  const fotw = useFilmOfTheWeek();
  const {
    film, recs, loading, activeMood, cardIndex,
    hasPrev, hasNext,
    setCardIndex, filterByMood, skipCurrent, saveFilm, markWatched,
  } = useRecommendations(user, profile, clubs);

  const [savedMovies, setSavedMovies] = useState<Set<number>>(new Set());
  const [feedbackShown, setFeedbackShown] = useState<number | null>(null);
  const [fotwSaved, setFotwSaved] = useState(false);

  const handleSave = async (movieId: number) => {
    setSavedMovies((prev) => new Set(prev).add(movieId));
    await saveFilm(movieId);
  };

  return (
    <section className="mb-8">
      {/* Section heading */}
      <div className="mb-4">
        <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/60">
          FILM CLUB RECOMMENDS
        </p>
        <h2 className="font-anton text-[clamp(2.2rem,8vw,2.8rem)] leading-none tracking-wide text-white">
          TONIGHT <span className="text-fc-red">FOR YOU</span>
        </h2>
      </div>

      {/* Mood filter strip */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => filterByMood(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] transition ${
            activeMood === null ? "border-fc-red bg-fc-red/15 text-fc-red" : "border-white/10 text-white/40 hover:border-white/25"
          }`}
        >
          FOR YOU
        </button>
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => filterByMood(m.id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] transition ${
              activeMood === m.id ? "border-fc-red bg-fc-red/15 text-fc-red" : "border-white/10 text-white/40 hover:border-white/25"
            }`}
          >
            <span className="text-[11px]">{m.emoji}</span>{m.id}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div
          className="mx-auto w-full max-w-[300px] animate-pulse overflow-hidden rounded-2xl"
          style={{ aspectRatio: "2/3", backgroundColor: SURFACE }}
        />
      )}

      {/* Recommendation card */}
      {!loading && film && (
        <>
          {/* Source badge */}
          <div className="mx-auto mb-2 flex max-w-[300px] items-center justify-between">
            <div className="flex items-center gap-1.5">
              {film.source === "community" ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fc-red opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fc-red" />
                  </span>
                  <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-fc-red/80">
                    COMMUNITY PICK
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px]">✦</span>
                  <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/35">
                    FILM CLUB APPROVED
                  </span>
                </>
              )}
            </div>
            {/* Dot pagination */}
            {recs.length > 1 && (
              <div className="flex gap-1.5">
                {recs.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCardIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === cardIndex ? "w-5 bg-white" : "w-1.5 bg-white/25"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Big poster */}
          <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
              <Image
                src={posterURL(film.poster_path, "w500")}
                alt={film.title}
                fill
                className="object-cover"
                sizes="300px"
                priority
              />
              {/* Gradient */}
              <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/60 to-transparent" />

              {/* Film info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                {/* WHY WE PICKED IT */}
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur-sm">
                  <span className="mt-0.5 text-[10px]">💬</span>
                  <p className="font-sans text-[11px] font-light italic leading-snug text-white/90">
                    {film.reason}
                  </p>
                </div>
                <p className="font-anton text-[clamp(1.4rem,5.5vw,1.9rem)] leading-tight tracking-wide text-white">
                  {film.title.toUpperCase()}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-white/50">
                  {film.release_year}
                  {film.vote_average > 0 && ` · ${film.vote_average.toFixed(1)} ★`}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mx-auto mt-3 max-w-[300px] space-y-2">
            {/* Primary: LOG IT */}
            <Link
              href={`/log?tmdb=${film.movie_id}`}
              className="block w-full rounded-full bg-fc-red py-3 text-center font-anton text-[11px] tracking-[0.14em] text-white shadow-[0_4px_20px_rgba(255,74,74,0.3)] transition hover:bg-fc-red/90 active:scale-[0.98]"
            >
              LOG IT
            </Link>

            {/* Secondary row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSave(film.movie_id)}
                disabled={savedMovies.has(film.movie_id)}
                className={`flex-1 rounded-full border py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition ${
                  savedMovies.has(film.movie_id)
                    ? "border-white/20 text-white/40"
                    : "border-white/15 text-white/60 hover:border-white/30 hover:text-white active:scale-[0.98]"
                }`}
              >
                {savedMovies.has(film.movie_id) ? "✓ SAVED" : "SAVE"}
              </button>
              <button
                type="button"
                onClick={() => markWatched(film.movie_id)}
                className="flex-1 rounded-full border border-white/15 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white/60 transition hover:border-white/30 hover:text-white active:scale-[0.98]"
              >
                SEEN IT ✓
              </button>
              <button
                type="button"
                onClick={() => skipCurrent(film.movie_id)}
                className="flex-1 rounded-full border border-white/[0.08] py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white/35 transition hover:border-white/20 hover:text-white/60 active:scale-[0.98]"
              >
                SKIP →
              </button>
            </div>

            {/* Prev / Next navigation */}
            {recs.length > 1 && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => setCardIndex((i) => i - 1)}
                  className="flex-1 rounded-xl border border-white/[0.06] py-2 font-mono text-[8px] text-white/30 transition disabled:opacity-20 enabled:hover:border-white/15 enabled:hover:text-white/60"
                >
                  ← PREV
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => setCardIndex((i) => i + 1)}
                  className="flex-1 rounded-xl border border-white/[0.06] py-2 font-mono text-[8px] text-white/30 transition disabled:opacity-20 enabled:hover:border-white/15 enabled:hover:text-white/60"
                >
                  NEXT →
                </button>
              </div>
            )}
          </div>

          {/* Post-watched feedback */}
          {feedbackShown !== null && (
            <div className="mx-auto mt-4 max-w-[300px] rounded-2xl border border-white/[0.08] p-4" style={{ backgroundColor: SURFACE }}>
              <p className="mb-3 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                How was that pick?
              </p>
              <div className="flex gap-2">
                {(["perfect_pick", "good", "miss"] as const).map((fb, i) => {
                  const labels = ["Perfect pick 🎯", "Good not great", "Missed badly"];
                  return (
                    <button
                      key={fb}
                      type="button"
                      onClick={async () => {
                        if (user?.id && feedbackShown) {
                          await logUserAction(user.id, feedbackShown, fb as UserAction);
                        }
                        setFeedbackShown(null);
                      }}
                      className="flex-1 rounded-xl border border-white/10 py-2 text-center font-mono text-[8px] text-white/50 transition hover:border-white/25 hover:text-white/80 active:scale-[0.98]"
                    >
                      {labels[i]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state when curated pool not yet seeded */}
      {!loading && !film && (
        <div className="rounded-2xl border border-white/[0.06] p-8 text-center" style={{ backgroundColor: SURFACE }}>
          <p className="text-2xl mb-3">🎬</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            No picks right now
          </p>
          <p className="mt-1 font-sans text-xs italic text-white/25">
            Try a different mood or check back later
          </p>
        </div>
      )}

      {/* ── Film of the Week ─────────────────────────────────── */}
      {fotw && (
        <section className="mt-6">
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.08]"
            style={{ background: "linear-gradient(135deg, #1a1929 0%, #2d1020 60%, #1e2020 100%)" }}
          >
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <span className="text-[18px]">🏆</span>
              <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-fc-red/90">FILM OF THE WEEK</p>
              <p className="ml-auto font-mono text-[7px] text-white/25">voted by the club</p>
            </div>
            <div className="flex gap-4 px-5 pb-5">
              <div className="relative h-[138px] w-[92px] shrink-0 overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <Image src={posterURL(fotw.poster_path, "w342")} alt={fotw.title} fill className="object-cover" sizes="92px" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="font-anton text-[clamp(1.1rem,4.5vw,1.5rem)] leading-tight tracking-wide text-white">
                  {fotw.title.toUpperCase()}
                </p>
                <div className="mt-3 flex items-baseline gap-5">
                  {fotw.avg_rating > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="font-anton text-[28px] leading-none text-fc-red">{fotw.avg_rating.toFixed(1)}</span>
                      <span className="font-mono text-[7px] text-white/30">AVG</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-anton text-[22px] leading-none text-white/50">{fotw.log_count}</span>
                    <span className="font-mono text-[7px] text-white/30">{fotw.log_count === 1 ? "LOG" : "LOGS"}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/log?tmdb=${fotw.tmdb_id}&title=${encodeURIComponent(fotw.title)}&poster=${encodeURIComponent(fotw.poster_path ?? "")}`}
                    className="rounded-full bg-fc-red px-5 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-white shadow-[0_4px_16px_rgba(255,74,74,0.3)] transition hover:bg-fc-red/85 active:scale-[0.98]"
                  >
                    LOG IT
                  </Link>
                  <button
                    type="button"
                    disabled={fotwSaved}
                    onClick={async () => {
                      if (user?.id) await logUserAction(user.id, fotw.tmdb_id, "save");
                      setFotwSaved(true);
                    }}
                    className={`rounded-full border px-5 py-2 font-mono text-[8px] uppercase tracking-[0.14em] transition active:scale-[0.98] ${
                      fotwSaved
                        ? "border-white/15 text-white/30"
                        : "border-white/20 text-white/55 hover:border-white/35 hover:text-white/80"
                    }`}
                  >
                    {fotwSaved ? "✓ SAVED" : "+ WATCHLIST"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

/* ================================================================
   CLUBS TAB — blockbuster header + engagement feed
   ================================================================ */
interface ClubsSectionProps {
  posts: (ClubPost & { club_name?: string; likes_count?: number })[];
  loading: boolean;
  likedPostIds: Set<string>;
  onToggleLike: (postId: string, currentCount: number, isLiked: boolean) => void;
  userId: string | undefined;
  profile: Profile | null;
  clubIds: string[];
  logs: FilmLog[];
}

function ClubsSection({ posts, loading, likedPostIds, onToggleLike, userId, profile, clubIds, logs }: ClubsSectionProps) {
  const nudge = streakNudgeState(logs, profile?.created_at);
  const streak = computeStreak(logs, profile?.created_at);

  return (
    <>
      <SundayRevealBanner clubIds={clubIds} />
      <TasteTribeCard userId={userId} profile={profile} />

      {/* Blockbuster heading */}
      <div className="mb-6 pt-2">
        <div className="mb-2 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fc-red opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fc-red" />
          </span>
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/60">LIVE NOW</p>
        </div>
        <h2 className="font-anton leading-[0.9] tracking-wide text-white" style={{ fontSize: "clamp(2.8rem,10vw,3.8rem)" }}>
          YOUR<br />CLUBS<br /><span className="text-fc-red">TONIGHT</span>
        </h2>
      </div>

      {/* Streak nudge */}
      {nudge === "danger" && streak > 0 && (
        <Link
          href="/log"
          className="mb-5 flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/[0.06] px-3.5 py-2.5 transition hover:border-orange-400/35"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-300/80">
            🔥 Log today — {streak}-day streak on the line
          </span>
          <span className="ml-auto font-mono text-[8px] text-orange-300/60">LOG →</span>
        </Link>
      )}

      {loading && <p className="py-12 text-center font-mono text-xs tracking-widest text-white/30">loading…</p>}

      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] p-10 text-center" style={{ backgroundColor: SURFACE }}>
          <p className="text-3xl">🎬</p>
          <p className="mt-4 font-anton text-[20px] tracking-wide text-white/70">NO ACTIVITY YET</p>
          <p className="mt-1.5 font-sans text-xs font-light italic text-white/40">
            Join clubs and start logging films to fill your feed.
          </p>
          <Link href="/clubs" className="mt-5 inline-block rounded-full border border-fc-red px-6 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-fc-red transition hover:bg-fc-red/10">
            EXPLORE CLUBS
          </Link>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} onToggleLike={onToggleLike} />
          ))}
        </div>
      )}

      <DailyPromptCard userId={userId} />
      <InviteUnlockCard userId={userId} />
    </>
  );
}

/* ================================================================
   HOME PAGE
   ================================================================ */
export default function HomePage() {
  const { user, profile } = useAuth();
  const { clubs } = useMyClubs(user?.id);
  const { logs } = useUserLogs(user?.id);
  const { like, unlike, fetchLikedPostIds } = useLikePost(user?.id);
  const [activeTab, setActiveTab] = useState<HomeTab>("trending");

  const clubIds = clubs.map((c) => c.id);
  const { posts, loading: feedLoading } = useHomeFeed(clubIds);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (posts.length === 0) return;
    fetchLikedPostIds(posts.map((p) => p.id)).then(setLikedPostIds);
  }, [posts, fetchLikedPostIds]);

  const handleToggleLike = useCallback(
    async (postId: string, currentCount: number, isLiked: boolean) => {
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });
      if (isLiked) await unlike(postId);
      else await like(postId);
    },
    [like, unlike]
  );

  const displayName = (profile?.display_name as string) || "Film lover";
  const streak = computeStreak(logs as FilmLog[], profile?.created_at);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-[480px]">

        {/* Fixed header + tab bar */}
        <div className="fixed left-1/2 top-0 z-50 w-full max-w-[480px] -translate-x-1/2" style={{ backgroundColor: BG }}>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="shrink-0 font-anton text-[22px] tracking-[0.08em] text-fc-red">FILM CLUB</h1>
              <p className="truncate font-sans text-[13px] text-white/45">
                Hey <span className="text-white/80">{displayName}</span>
                {streak > 0 && <span className="ml-2 font-mono text-[11px] text-fc-red">🔥 {streak}</span>}
              </p>
            </div>
            <NotificationBell />
          </div>

          <div className="grid grid-cols-2 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab("trending")}
              className={`py-3 font-anton text-[13px] tracking-[0.08em] transition border-b-2 ${
                activeTab === "trending" ? "border-fc-red text-fc-red" : "border-transparent text-white/30 hover:text-white/55"
              }`}
            >
              TRENDING
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("clubs")}
              className={`relative py-3 font-anton text-[13px] tracking-[0.08em] transition border-b-2 ${
                activeTab === "clubs" ? "border-fc-red text-fc-red" : "border-transparent text-white/30 hover:text-white/55"
              }`}
            >
              CLUBS
              {posts.length > 0 && activeTab !== "clubs" && (
                <span className="absolute right-[calc(50%-1.8rem)] top-3 h-1.5 w-1.5 rounded-full bg-fc-red" />
              )}
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="px-4 pt-[calc(8rem+env(safe-area-inset-top))]">
          {activeTab === "trending" && (
            <TonightForYouSection
              user={user}
              profile={profile as Profile | null}
              clubs={clubs}
            />
          )}
          {activeTab === "clubs" && (
            <ClubsSection
              posts={posts}
              loading={feedLoading}
              likedPostIds={likedPostIds}
              onToggleLike={handleToggleLike}
              userId={user?.id}
              profile={profile as Profile | null}
              clubIds={clubIds}
              logs={logs as FilmLog[]}
            />
          )}
        </main>

        {/* Bottom nav */}
        <nav
          className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-white/[0.06] px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
          style={{ backgroundColor: BG }}
        >
          <div className="grid grid-cols-5 items-end">
            <NavItem icon={<IconHome />} label="Home" active />
            <NavItem icon={<IconDiscover />} label="Discover" href="/discover" />
            <div className="flex flex-col items-center justify-end pb-0.5">
              <Link
                href="/log"
                aria-label="Log a film"
                className="flex h-[38px] w-[38px] -translate-y-2 items-center justify-center rounded-full bg-fc-red text-2xl font-light leading-none text-white shadow-[0_4px_14px_rgba(255,87,87,0.4)]"
              >
                +
              </Link>
              <span className="mt-0.5 font-mono text-[6.5px] uppercase tracking-wider text-[#E8E4D4]/20">LOG</span>
            </div>
            <NavItem icon={<IconClubs />} label="Clubs" href="/clubs" />
            <NavItem icon={<IconProfile />} label="Profile" href="/profile" />
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ================================================================
   FEED CARD
   ================================================================ */
function FeedCard({
  post,
  isLiked,
  onToggleLike,
}: {
  post: ClubPost & { club_name?: string; likes_count?: number };
  isLiked: boolean;
  onToggleLike: (postId: string, currentCount: number, isLiked: boolean) => void;
}) {
  const profile = post.profiles ?? null;
  const filmLog = post.film_logs ?? null;
  const name = profile?.display_name || profile?.username || "Someone";
  const avatarInitial = name.charAt(0).toUpperCase();
  const serverCount = post.likes_count ?? 0;
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localCount, setLocalCount] = useState(serverCount);

  useEffect(() => { setLocalLiked(isLiked); }, [isLiked]);
  useEffect(() => { setLocalCount(serverCount); }, [serverCount]);

  const handleHeart = () => {
    const nextLiked = !localLiked;
    setLocalLiked(nextLiked);
    setLocalCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    onToggleLike(post.id, localCount, localLiked);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]" style={{ backgroundColor: SURFACE }}>
      <div className="p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fc-red/20 font-anton text-xs text-fc-red">
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-sans text-[12px] font-medium text-white/90">{name}</span>
              {post.club_name && (
                <>
                  <span className="font-mono text-[8px] text-white/20">in</span>
                  <span className="truncate font-mono text-[9px] text-fc-red/70">{post.club_name}</span>
                </>
              )}
            </div>
            <p className="font-mono text-[7px] text-white/25">{getTimeAgo(post.created_at)}</p>
          </div>
        </div>

        {filmLog && (
          <Link href={`/log/${filmLog.id}`} className="mt-3 flex gap-3 rounded-lg bg-white/[0.03] p-2.5 transition hover:bg-white/[0.06]">
            <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-md">
              <Image src={posterURL(filmLog.poster_path, "w185")} alt={filmLog.title} fill className="object-cover" sizes="48px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-anton text-[14px] leading-tight tracking-wide text-white/90">{filmLog.title.toUpperCase()}</p>
              {filmLog.rating && <p className="mt-1 font-anton text-[16px] text-fc-red">{filmLog.rating.toFixed(1)}</p>}
              {filmLog.review_text && <p className="mt-1 line-clamp-2 font-sans text-[11px] font-light text-white/45">{filmLog.review_text}</p>}
            </div>
          </Link>
        )}

        {post.body && !filmLog && <p className="mt-2.5 font-sans text-[13px] font-light leading-relaxed text-white/70">{post.body}</p>}
        {post.body && filmLog && <p className="mt-2 font-sans text-[12px] font-light italic text-white/50">{post.body}</p>}

        <div className="mt-3 flex items-center justify-end border-t border-white/[0.04] pt-2.5">
          <button
            type="button"
            onClick={handleHeart}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 transition active:scale-90 hover:bg-white/[0.04]"
            aria-label={localLiked ? "Unlike" : "Like"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={localLiked ? RED : "none"} stroke={localLiked ? RED : "rgba(255,255,255,0.4)"} strokeWidth="1.75" className="transition-all duration-150">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {localCount > 0 && <span className={`font-mono text-[9px] ${localLiked ? "text-fc-red" : "text-white/30"}`}>{localCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, href }: { icon: React.ReactNode; label: string; active?: boolean; href?: string }) {
  const inner = (
    <>
      <span className={active ? "text-fc-red" : "text-[#E8E4D4]/20"}>{icon}</span>
      <span className={`font-mono text-[6.5px] uppercase tracking-wider ${active ? "text-fc-red/90" : "text-[#E8E4D4]/20"}`}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="flex flex-col items-center justify-end gap-1 pb-0.5">{inner}</Link>
  ) : (
    <button type="button" className="flex flex-col items-center justify-end gap-1 pb-0.5">{inner}</button>
  );
}
