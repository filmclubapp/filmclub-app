"use client";

/* ============================================================
   FILM CLUB — LOG / CREATE
   "The single best place to log a film."
   Quick if you want quick. A cathedral if you want to stay.
   ============================================================ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { searchFilms, getFilmDetails, type TMDBFilm } from "../lib/tmdb";
import { useAuth } from "../lib/auth-context";
import { useMyClubs, useWatchlist, createLog, shareToClubs } from "../lib/hooks";
import FilmClubCard from "../components/FilmClubCard";

/* ---------- palette ---------- */
const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const MUTED = "#8B88A6";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

/* ---------- types ---------- */
type CreateTab = "review" | "watchlist" | "list" | "diary" | "club";
type ComposerMode = "text" | "voice" | "video";

interface FilmSearchResult {
  id: string;
  tmdbId: number;
  title: string;
  year: string;
  director: string;
  runtime: string;
  tmdbPoster?: string;
  backdrop_path?: string | null;
  accent: string;
  genre_ids: number[];
}

interface TagOption {
  id: string;
  label: string;
  /** "casual" leans mainstream, "cinephile" leans deep, "shared" both */
  lane: "casual" | "cinephile" | "shared";
  emoji?: string;
}

/* ---------- tag library — casual + cinephile, mixed ---------- */
const TAG_LIBRARY: TagOption[] = [
  // take tags — social layer
  { id: "hot-take", label: "HOT TAKE", lane: "shared", emoji: "🌶️" },
  { id: "popular-take", label: "POPULAR TAKE", lane: "shared", emoji: "🤝" },
  { id: "underrated", label: "UNDERRATED", lane: "shared", emoji: "💎" },
  { id: "overrated", label: "OVERRATED", lane: "shared", emoji: "📉" },
  // shared / mood
  { id: "rewatch", label: "REWATCH", lane: "shared", emoji: "↺" },
  { id: "comfort", label: "COMFORT FILM", lane: "casual", emoji: "♡" },
  { id: "elevated-mood", label: "BIG MOOD", lane: "casual" },
  { id: "slept-on", label: "SLEPT ON", lane: "casual", emoji: "😴" },
  { id: "masterpiece", label: "MASTERPIECE", lane: "shared", emoji: "✦" },
  // cinephile-leaning
  { id: "formal", label: "FORMAL MASTERY", lane: "cinephile" },
  { id: "score", label: "THE SCORE", lane: "cinephile", emoji: "♪" },
  { id: "cinematography", label: "CINEMATOGRAPHY", lane: "cinephile" },
  { id: "editing", label: "EDITING", lane: "cinephile" },
  { id: "performance", label: "PERFORMANCE", lane: "shared" },
  { id: "ending", label: "THE ENDING", lane: "shared" },
  { id: "needs-second", label: "NEEDS A SECOND WATCH", lane: "cinephile" },
  // viewing context
  { id: "theatre", label: "IN THEATRE", lane: "shared", emoji: "◉" },
  { id: "35mm", label: "35MM", lane: "cinephile" },
  { id: "imax", label: "IMAX", lane: "casual" },
  { id: "late-night", label: "LATE NIGHT WATCH", lane: "casual", emoji: "🌙" },
  // emotional / reaction
  { id: "cried", label: "I CRIED", lane: "shared", emoji: "😭" },
  { id: "shook", label: "SHOOK", lane: "casual" },
  { id: "ate", label: "ATE.", lane: "casual", emoji: "💅" },
  { id: "miscast", label: "MISCAST", lane: "cinephile" },
  { id: "mind-blown", label: "MIND BLOWN", lane: "casual", emoji: "🤯" },
  { id: "fell-asleep", label: "FELL ASLEEP", lane: "casual", emoji: "💤" },
];

/* ---------- emotion tones — "how did it make you feel?" ---------- */
const TONES = [
  { id: "wonder", label: "IN AWE", color: "#9C7BFF" },
  { id: "ache", label: "HEARTBROKEN", color: "#FF4A4A" },
  { id: "rage", label: "FURIOUS", color: "#FF8A4A" },
  { id: "joy", label: "EUPHORIC", color: "#FFD86F" },
  { id: "dread", label: "UNSETTLED", color: "#5B6A7A" },
  { id: "tender", label: "WARM INSIDE", color: "#FFB199" },
  { id: "cold", label: "NUMB", color: "#7AC4D9" },
  { id: "inspired", label: "INSPIRED", color: "#4ADE80" },
  { id: "nostalgic", label: "NOSTALGIC", color: "#D4A574" },
  { id: "empty", label: "EMPTY", color: "#6B7280" },
  { id: "obsessed", label: "OBSESSED", color: "#F472B6" },
  { id: "conflicted", label: "CONFLICTED", color: "#A78BFA" },
];

/* ---------- helpers ---------- */
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/* ============================================================
   PAGE
   ============================================================ */
export default function LogPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: BG, minHeight: "100vh" }} />}>
      <LogPageInner />
    </Suspense>
  );
}

function LogPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div style={{ backgroundColor: BG, minHeight: "100vh" }} />;
  }

  return <LogPageContent />;
}

function LogPageContent() {
  const [tab, setTab] = useState<CreateTab>("review");

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: BG, color: INK }}>
      {/* film grain + soft vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(ellipse 200% 80% at 50% 0%, ${RED}08, transparent 80%)`,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.3]"
        style={{
          background: `radial-gradient(ellipse 800% 400% at 100% 100%, ${RED}05, transparent 50%)`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-anton text-4xl font-black tracking-tight">THE LOG</h1>
            <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.24em] text-[#F4EFD8]/60">
              Quick, considered, forever.
            </p>
          </div>
          <Link
            href="/home"
            className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#F4EFD8]/70 transition hover:text-[#F4EFD8]"
          >
            ← Back
          </Link>
        </div>

        {/* tab navigation */}
        <div className="mb-8 flex gap-2 border-b border-white/[0.08]">
          {(["review", "diary", "watchlist", "list", "club"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                tab === t
                  ? "border-b-2 border-fc-red text-fc-red"
                  : "border-b-2 border-transparent text-[#F4EFD8]/50 hover:text-[#F4EFD8]/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* content area */}
        {tab === "review" && <ReviewPage />}
        {tab === "diary" && <PlaceholderTab label="DIARY" />}
        {tab === "watchlist" && <PlaceholderTab label="WATCHLIST" />}
        {tab === "list" && <PlaceholderTab label="LIST" />}
        {tab === "club" && <PlaceholderTab label="CLUB" />}
      </div>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-center font-mono text-[12px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
        {label} — coming soon
      </p>
    </div>
  );
}

/* ============================================================
   REVIEW PAGE
   ============================================================ */
function ReviewPage() {
  const [film, setFilm] = useState<FilmSearchResult | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const { user } = useAuth();
  const watchlist = useWatchlist(user?.id);
  const searchParams = useSearchParams();

  // Auto-select film when ?tmdb= param is present (e.g. from Film of the Week / recommendations)
  useEffect(() => {
    const tmdbParam = searchParams.get("tmdb");
    if (!tmdbParam || film) return;
    const tmdbId = parseInt(tmdbParam);
    if (isNaN(tmdbId)) return;

    const titleParam = searchParams.get("title");
    const posterParam = searchParams.get("poster");

    if (titleParam) {
      // Use the params directly — no API call needed
      setFilm({
        id: `tmdb-${tmdbId}`,
        tmdbId,
        title: decodeURIComponent(titleParam),
        year: searchParams.get("year") ?? "",
        director: "",
        runtime: "",
        tmdbPoster: posterParam ? decodeURIComponent(posterParam) : undefined,
        accent: "#FF4A4A",
        genre_ids: [],
      });
    } else {
      // Fetch full details from TMDB
      setPrefilling(true);
      getFilmDetails(tmdbId)
        .then((details) => {
          setFilm({
            id: `tmdb-${tmdbId}`,
            tmdbId,
            title: details.title,
            year: details.release_date?.slice(0, 4) ?? "",
            director: details.credits?.crew.find((c) => c.job === "Director")?.name ?? "",
            runtime: details.runtime ? `${details.runtime}m` : "",
            tmdbPoster: details.poster_path ?? undefined,
            backdrop_path: details.backdrop_path ?? undefined,
            accent: "#FF4A4A",
            genre_ids: details.genre_ids ?? [],
          });
        })
        .catch(() => {/* let user search manually */})
        .finally(() => setPrefilling(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (prefilling) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#F4EFD8]/40 animate-pulse">Loading film…</p>
      </div>
    );
  }

  if (!film) {
    return <FilmSearch onPick={setFilm} watchlist={watchlist} />;
  }

  return <ReviewComposer film={film} onBack={() => setFilm(null)} />;
}

/* ============================================================
   FILM SEARCH — live TMDB search with 300ms debounce
   ============================================================ */
function FilmSearch({ onPick, watchlist }: { onPick: (f: FilmSearchResult) => void; watchlist: ReturnType<typeof useWatchlist> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FilmSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const films = await searchFilms(q);
        const mapped = films.slice(0, 8).map((f) => ({
          id: `tmdb-${f.id}`,
          tmdbId: f.id,
          title: f.title,
          year: f.release_date?.slice(0, 4) ?? "",
          director: "",
          runtime: "",
          tmdbPoster: f.poster_path ?? undefined,
          backdrop_path: f.backdrop_path ?? undefined,
          accent: "#FF4A4A",
          genre_ids: f.genre_ids ?? [],
        }));
        setResults(mapped);
      } catch (e) {
        console.error("Search error:", e);
      }
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  return (
    <div>
      <div className="mb-6">
        <label className="block font-mono text-[12px] uppercase tracking-[0.24em] text-[#F4EFD8]/60 mb-3">
          Find a film
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, director, year…"
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 font-mono text-[14px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:border-fc-red focus:bg-white/[0.08] focus:outline-none transition"
        />
        {searching && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#F4EFD8]/50">
            searching…
          </p>
        )}
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((film) => (
            <FilmSearchCard key={film.id} film={film} onPick={onPick} watchlist={watchlist} />
          ))}
        </div>
      )}

      {q && !searching && results.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
            No results. Try a different search.
          </p>
        </div>
      )}

      {!q && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
            Type to search…
          </p>
        </div>
      )}
    </div>
  );
}

function FilmSearchCard({
  film,
  onPick,
  watchlist,
}: {
  film: FilmSearchResult;
  onPick: (f: FilmSearchResult) => void;
  watchlist: ReturnType<typeof useWatchlist>;
}) {
  const onWatchlist = watchlist.isOnWatchlist(film.tmdbId);
  const [adding, setAdding] = useState(false);

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    if (onWatchlist) {
      await watchlist.remove(film.tmdbId);
    } else {
      await watchlist.add(film.tmdbId, film.title, film.tmdbPoster ?? null, parseInt(film.year) || null);
    }
    setAdding(false);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] text-left transition hover:border-white/[0.15] hover:bg-white/[0.08]">
      <button
        type="button"
        onClick={() => onPick(film)}
        className="w-full p-3 text-left"
      >
        {film.tmdbPoster && (
          <div className="mb-3 aspect-[2/3] overflow-hidden rounded-lg bg-white/[0.05]">
            <img
              src={`${TMDB_IMG}${film.tmdbPoster}`}
              alt={film.title}
              className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition"
            />
          </div>
        )}
        <h3 className="font-anton text-[13px] font-black leading-tight">{film.title}</h3>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
          {film.year}
        </p>
      </button>
      {/* Add to watchlist */}
      <button
        type="button"
        onClick={handleWatchlist}
        disabled={adding}
        className={`absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-sm transition active:scale-90 ${
          onWatchlist
            ? "bg-fc-red/80 border border-fc-red/50 text-white"
            : "bg-black/50 border border-white/[0.15] text-[#F4EFD8]/70 hover:text-[#F4EFD8]"
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill={onWatchlist ? "white" : "none"} stroke={onWatchlist ? "white" : "currentColor"} strokeWidth="2" strokeLinecap="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        <span className="font-mono text-[7px] uppercase tracking-[0.12em]">
          {adding ? "..." : onWatchlist ? "SAVED" : "WATCHLIST"}
        </span>
      </button>
    </div>
  );
}

/* ============================================================
   REVIEW COMPOSER
   ============================================================ */
function ReviewComposer({
  film,
  onBack,
}: {
  film: FilmSearchResult;
  onBack: () => void;
}) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { clubs: myClubs } = useMyClubs(user?.id);

  const [rating, setRating] = useState(0);
  const [firstWatch, setFirstWatch] = useState(true);
  const [spoiler, setSpoiler] = useState(false);
  const [text, setText] = useState("");
  const [tone, setTone] = useState<string | null>(null);
  const [tagSet, setTagSet] = useState<Set<string>>(new Set());
  const [date, setDate] = useState("today");
  const [mode, setMode] = useState<ComposerMode>("text");
  const [share, setShare] = useState({ public: true, selectedClubs: new Set<string>() });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showCard, setShowCard] = useState(false);

  const accent = film.accent;

  const handleLog = useCallback(async () => {
    if (!film || !user) return;

    setSaving(true);
    setSaveError("");
    try {
      const watchedDate =
        date === "today"
          ? new Date().toISOString().slice(0, 10)
          : date === "yesterday"
            ? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

      const { data: log, error: logError } = await createLog({
        user_id: user.id,
        tmdb_id: film.tmdbId,
        title: film.title,
        poster_path: film.tmdbPoster ?? null,
        backdrop_path: film.backdrop_path ?? null,
        rating: rating > 0 ? rating : null,
        review_text: text || null,
        is_rewatch: !firstWatch,
        has_spoilers: spoiler,
        watched_date: watchedDate,
        genre_ids: film.genre_ids,
        release_year: parseInt(film.year) || null,
      });

      if (logError) {
        console.error("Log error:", logError);
        const msg = (logError as any)?.message || "Failed to save your log.";
        setSaveError(msg.includes("relation") || msg.includes("does not exist")
          ? "Database not set up yet. Run setup.sql in Supabase SQL Editor."
          : `Couldn't save: ${msg}`);
        setSaving(false);
        return;
      }

      if (log && share.selectedClubs.size > 0) {
        await shareToClubs(log.id, user.id, [...share.selectedClubs], text || undefined);
      }

      setSaving(false);
      setShowCard(true); // Show Film Club Card instead of navigating
    } catch (e) {
      console.error("Error creating log:", e);
      setSaveError("Something went wrong. Check your connection and try again.");
      setSaving(false);
    }
  }, [film, user, date, rating, firstWatch, spoiler, text, share, router]);

  return (
    <div>
      {/* FILM CLUB CARD — shown after successful log */}
      {showCard && (
        <FilmClubCard
          title={film.title}
          year={parseInt(film.year) || null}
          posterPath={film.tmdbPoster ?? null}
          backdropPath={film.backdrop_path ?? null}
          rating={rating > 0 ? rating : null}
          reviewText={text || null}
          username={profile?.username || "user"}
          displayName={profile?.display_name || profile?.username || "cinephile"}
          onClose={() => router.push("/home")}
        />
      )}

      <button
        type="button"
        onClick={onBack}
        className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#F4EFD8]/60 transition hover:text-[#F4EFD8]"
      >
        ← Choose another
      </button>

      {/* film header */}
      <FilmHeader film={film} accent={accent} />

      <div className="mt-8 space-y-8">
        {/* 1. RATING */}
        <RatingSection rating={rating} setRating={setRating} accent={accent} />

        {/* 2. REWATCH + DATE */}
        <section>
          <SectionLabel>2 — THE CONTEXT</SectionLabel>
          <div className="space-y-3">
            <PillToggle
              label="FIRST WATCH"
              checked={firstWatch}
              onChange={setFirstWatch}
              accent={accent}
            />
            {!firstWatch && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
                  How many times seen?
                </p>
                <input
                  type="number"
                  min="1"
                  defaultValue="2"
                  className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 font-mono text-[12px] text-[#F4EFD8] focus:outline-none"
                />
              </div>
            )}
            <PillToggle
              label="HAS SPOILERS"
              checked={spoiler}
              onChange={setSpoiler}
              accent={accent}
            />
          </div>
        </section>

        {/* 3. COMPOSER (text, voice, video) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>3 — THE WORDS</SectionLabel>
            <ModeSwitch mode={mode} setMode={setMode} />
          </div>

          {mode === "text" && (
            <TextComposer value={text} onChange={setText} spoiler={spoiler} accent={accent} />
          )}
          {mode === "voice" && <ComingSoonComposer kind="VOICE" />}
          {mode === "video" && <ComingSoonComposer kind="VIDEO" />}
        </section>

        {/* 4. TONE */}
        <TonePicker tone={tone} setTone={setTone} />

        {/* 5. TAGS */}
        <TagPicker tagSet={tagSet} toggleTag={(id) => {
          const next = new Set(tagSet);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setTagSet(next);
        }} />

        {/* 6. DEVOTIONAL EXTRAS */}
        <DevotionalExtras accent={accent} />

        {/* 7. SHARING */}
        <ShareToggle
          share={share}
          setShare={setShare}
          myClubs={myClubs}
          accent={accent}
        />

        {/* 8. ERROR + LOG BUTTON */}
        {saveError && (
          <div className="mb-4 rounded-xl border border-fc-red/30 bg-fc-red/10 px-4 py-3">
            <p className="font-mono text-[11px] text-fc-red">{saveError}</p>
          </div>
        )}
        <LogBar
          clubs={myClubs}
          onLog={handleLog}
          saving={saving}
        />
      </div>
    </div>
  );
}

/* ============================================================
   FILM HEADER
   ============================================================ */
function FilmHeader({ film, accent }: { film: FilmSearchResult; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
      {film.backdrop_path && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${TMDB_IMG}${film.backdrop_path})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `linear-gradient(135deg, ${accent}08, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex gap-5">
        {film.tmdbPoster && (
          <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/[0.1]">
            <img
              src={`${TMDB_IMG}${film.tmdbPoster}`}
              alt={film.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-anton text-3xl font-black leading-tight">{film.title}</h2>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.18em] text-[#F4EFD8]/60">
            {film.year} • {film.director || "Unknown"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {film.genre_ids.slice(0, 3).map((gid) => (
              <span
                key={gid}
                className="rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{
                  borderColor: `${accent}80`,
                  color: accent,
                }}
              >
                #{gid}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RATING SECTION
   ============================================================ */
function RatingSection({
  rating,
  setRating,
  accent,
}: {
  rating: number;
  setRating: (r: number) => void;
  accent: string;
}) {
  return (
    <section>
      <SectionLabel>1 — THE RATING</SectionLabel>
      <RatingBar rating={rating} setRating={setRating} accent={accent} />
    </section>
  );
}

/* ============================================================
   RATING BAR
   ============================================================ */
function RatingBar({
  rating,
  setRating,
  accent,
}: {
  rating: number;
  setRating: (r: number) => void;
  accent: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const calcRating = (clientX: number) => {
    if (!ref.current) return rating;
    const rect = ref.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = clamp(x / rect.width, 0, 1);
    // Round to 1 decimal place: 0.0, 0.1, 0.2 ... 9.9, 10.0
    return Math.round(percent * 100) / 10;
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setRating(calcRating(e.clientX));
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return; // only when dragging
    setRating(calcRating(e.clientX));
  };

  const label = rating === 0 ? "TAP TO RATE" : `${rating.toFixed(1)}/10`;

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="group relative h-12 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] transition hover:border-white/[0.15]"
        style={{ cursor: "pointer", touchAction: "none" }}
      >
        {/* filled bar */}
        <div
          className="h-full transition-[width] duration-75"
          style={{
            width: `${(rating / 10) * 100}%`,
            backgroundColor: `${accent}40`,
          }}
        />
        {/* label */}
        <div className="absolute inset-0 flex items-center justify-center font-anton text-[18px] tracking-[0.06em]" style={{ color: rating > 0 ? accent : undefined }}>
          {label}
        </div>
      </div>
      {/* Quick-tap whole numbers */}
      <div className="flex justify-between px-1">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            className="text-[10px] font-mono uppercase tracking-[0.12em] py-1 px-0.5"
            style={{
              color: i <= rating ? accent : "rgba(244,239,216,0.25)",
              transition: "color 0.2s",
            }}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PILL TOGGLE
   ============================================================ */
function PillToggle({
  label,
  checked,
  onChange,
  accent,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border px-4 py-3 transition"
      style={{
        borderColor: checked ? accent : "rgba(255,255,255,0.08)",
        backgroundColor: checked ? `${accent}15` : "rgba(255,255,255,0.025)",
      }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
        {label}
      </span>
      <div
        className="h-5 w-9 rounded-full transition"
        style={{
          backgroundColor: checked ? accent : "#F4EFD8/20",
        }}
      >
        <div
          className="h-5 w-5 rounded-full bg-white transition-transform"
          style={{
            transform: checked ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </div>
    </button>
  );
}

/* ============================================================
   DATE PILL
   ============================================================ */
function DatePill({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const options = [
    { id: "today", label: "TODAY" },
    { id: "yesterday", label: "YESTERDAY" },
    { id: "earlier", label: "EARLIER" },
  ];

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
        When watched?
      </p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setDate(opt.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
              date === opt.id
                ? "bg-fc-red text-white"
                : "bg-white/[0.04] text-[#F4EFD8]/60 hover:text-[#F4EFD8]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   MODE SWITCH (text / voice / video)
   ============================================================ */
function ModeSwitch({
  mode,
  setMode,
}: {
  mode: ComposerMode;
  setMode: (m: ComposerMode) => void;
}) {
  const modes: ComposerMode[] = ["text", "voice", "video"];

  return (
    <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
      {modes.map((m) => {
        const locked = m === "voice" || m === "video";
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] transition ${
              mode === m ? "bg-fc-red text-white" : "text-[#F4EFD8]/60 hover:text-[#F4EFD8]"
            }`}
          >
            {m}
            {locked ? <span className="ml-1 text-[7px] opacity-70">soon</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function ComingSoonComposer({ kind }: { kind: "VOICE" | "VIDEO" }) {
  return (
    <section>
      <SectionLabel>3 — {kind} LOGGING</SectionLabel>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-fc-red/80">Coming Soon</p>
        <p className="mt-2 font-anton text-[24px] leading-none text-[#F4EFD8]">{kind} MODE</p>
        <p className="mt-2 font-sans text-[12px] italic text-[#F4EFD8]/55">
          We are polishing capture, quality, and playback for MVP.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   TEXT COMPOSER
   ============================================================ */
function TextComposer({
  value,
  onChange,
  spoiler,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  spoiler: boolean;
  accent: string;
}) {
  const [essay, setEssay] = useState(false);
  const placeholders = [
    "what moved you…",
    "first instinct only…",
    "what the film left in the room after…",
    "what nobody else seems to be saying…",
    "the frame you can't stop thinking about…",
  ];
  const [phIdx] = useState(() => Math.floor(Math.random() * placeholders.length));

  return (
    <section>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEssay(!essay)}
          className={`rounded-full border px-3 py-1 font-mono text-[8px] uppercase tracking-[0.18em] transition ${
            essay
              ? "border-fc-red bg-fc-red text-white"
              : "border-white/[0.1] text-[#F4EFD8]/55 hover:text-[#F4EFD8]"
          }`}
        >
          {essay ? "ESSAY MODE ON" : "GO LONG →"}
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]"
        style={{
          boxShadow: essay ? `inset 0 0 0 1px ${accent}33, 0 12px 36px rgba(0,0,0,0.35)` : undefined,
        }}
      >
        {spoiler && (
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-fc-red/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-fc-red" />
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-fc-red">
              SPOILERS — HIDDEN BY DEFAULT
            </span>
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholders[phIdx]}
          rows={essay ? 14 : 5}
          className="w-full resize-none bg-transparent px-4 py-3.5 font-dm text-[14px] leading-[1.55] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none"
          style={{
            fontFamily: essay ? "'DM Serif Display', Georgia, serif" : undefined,
          }}
        />
        <div className="flex items-center justify-between border-t border-white/[0.05] px-3 py-2">
          <div className="flex gap-2">
            <ComposerChip label="QUOTE" />
            <ComposerChip label="STILL" />
            <ComposerChip label="LINK" />
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#F4EFD8]/35">
            {value.length} chars
          </span>
        </div>
      </div>

      <p className="mt-2 px-1 font-mono text-[8px] uppercase leading-[1.6] tracking-[0.16em] text-[#F4EFD8]/30">
        write 12 words. write 12,000. film club doesn't care which.
      </p>
    </section>
  );
}

function ComposerChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#F4EFD8]/55 hover:text-[#F4EFD8]"
    >
      + {label}
    </button>
  );
}

/* ============================================================
   VOICE COMPOSER
   ============================================================ */
function VoiceComposer({ accent }: { accent: string }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <section>
      <SectionLabel>3 — THE VOICE NOTE</SectionLabel>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
        <div className="flex items-end justify-center gap-[3px]" style={{ height: 64 }}>
          {Array.from({ length: 38 }).map((_, i) => {
            const h = recording
              ? 6 + Math.abs(Math.sin(i * 0.5 + seconds)) * 50
              : 4 + ((i * 7) % 28);
            return (
              <div
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  height: h,
                  backgroundColor: recording ? accent : "#F4EFD840",
                  transition: "height 0.15s ease-out",
                }}
              />
            );
          })}
        </div>
        <div className="mt-4 text-center font-anton text-[28px] tracking-[0.05em] text-[#F4EFD8]">
          {mm}:{ss}
        </div>
        <button
          type="button"
          onClick={() => setRecording((r) => !r)}
          className={`mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full transition ${
            recording ? "bg-white text-fc-red" : "bg-fc-red text-white shadow-[0_8px_24px_rgba(255,74,74,0.4)]"
          }`}
          aria-label={recording ? "Stop" : "Record"}
        >
          {recording ? (
            <div className="h-4 w-4 rounded-sm bg-fc-red" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-white" />
          )}
        </button>
        <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
          {recording ? "speak — auto-transcribes" : "tap to record · max 5 min"}
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   VIDEO COMPOSER
   ============================================================ */
function VideoComposer({ accent }: { accent: string }) {
  return (
    <section>
      <SectionLabel>3 — THE VIDEO REVIEW</SectionLabel>
      <div className="relative aspect-[9/12] overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(80% 60% at 50% 40%, ${accent}33, transparent 70%)`,
          }}
        />
        {/* corner brackets */}
        {([
          ["top-3 left-3", "border-l-2 border-t-2"],
          ["top-3 right-3", "border-r-2 border-t-2"],
          ["bottom-3 left-3", "border-l-2 border-b-2"],
          ["bottom-3 right-3", "border-r-2 border-b-2"],
        ] as const).map(([pos, b], i) => (
          <div key={i} className={`absolute ${pos} h-5 w-5 ${b} border-fc-red/80`} />
        ))}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 font-mono text-[8px] uppercase tracking-[0.22em] text-[#F4EFD8]/60">
          ● REC · 9:16
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-fc-red text-white shadow-[0_10px_30px_rgba(255,74,74,0.5)] ring-4 ring-white/10"
            aria-label="Record video"
          >
            <div className="h-12 w-12 rounded-full border-2 border-white" />
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <SmallChip label="UPLOAD" />
        <SmallChip label="CAPTIONS" />
        <SmallChip label="MUSIC" />
      </div>
    </section>
  );
}

function SmallChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-xl border border-white/[0.06] bg-white/[0.025] py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#F4EFD8]/55 hover:text-[#F4EFD8]"
    >
      + {label}
    </button>
  );
}

/* ============================================================
   TONE PICKER
   ============================================================ */
function TonePicker({
  tone,
  setTone,
}: {
  tone: string | null;
  setTone: (t: string | null) => void;
}) {
  return (
    <section>
      <SectionLabel>4 — HOW DID IT MAKE YOU FEEL?</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {TONES.map((t) => {
          const active = tone === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(active ? null : t.id)}
              className="rounded-full border px-3 py-1.5 font-anton text-[10px] tracking-[0.16em] transition"
              style={{
                borderColor: active ? t.color : "#F4EFD81A",
                backgroundColor: active ? `${t.color}25` : "transparent",
                color: active ? t.color : "#F4EFD899",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   TAG PICKER
   ============================================================ */
function TagPicker({
  tagSet,
  toggleTag,
}: {
  tagSet: Set<string>;
  toggleTag: (id: string) => void;
}) {
  const [lane, setLane] = useState<"all" | "casual" | "cinephile">("all");
  const filtered = TAG_LIBRARY.filter(
    (t) => lane === "all" || t.lane === lane || t.lane === "shared",
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel>5 — TAGS</SectionLabel>
        <div className="flex gap-1">
          {(["all", "casual", "cinephile"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLane(l)}
              className={`rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] transition ${
                lane === l
                  ? "bg-fc-red text-white"
                  : "bg-white/[0.04] text-[#F4EFD8]/45 hover:text-[#F4EFD8]/80"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filtered.map((t) => {
          const active = tagSet.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={`rounded-full border px-2.5 py-1.5 font-anton text-[9.5px] tracking-[0.14em] transition ${
                active
                  ? "border-fc-red bg-fc-red/15 text-fc-red"
                  : "border-white/[0.08] bg-white/[0.025] text-[#F4EFD8]/65 hover:text-[#F4EFD8]"
              }`}
            >
              {t.emoji && <span className="mr-1 opacity-80">{t.emoji}</span>}
              {t.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   DEVOTIONAL EXTRAS
   ============================================================ */
function DevotionalExtras({ accent }: { accent: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition hover:border-white/[0.1]"
      >
        <SectionLabel>6 — EXTRAS</SectionLabel>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.015] p-4">
          <div>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
              Notable cast
            </p>
            <input
              type="text"
              placeholder="e.g., Oscar Isaac, Saoirse Ronan…"
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 font-mono text-[12px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
              Watched with
            </p>
            <input
              type="text"
              placeholder="Friends, family, alone…"
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 font-mono text-[12px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
              Mood before
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["calm", "excited", "tired", "anxious", "happy", "sad"].map((m) => (
                <button
                  key={m}
                  type="button"
                  className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/60 transition hover:text-[#F4EFD8]"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   SHARE TOGGLE
   ============================================================ */
function ShareToggle({
  share,
  setShare,
  myClubs,
  accent,
}: {
  share: { public: boolean; selectedClubs: Set<string> };
  setShare: (s: { public: boolean; selectedClubs: Set<string> }) => void;
  myClubs: { id: string; name: string }[];
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition hover:border-white/[0.1]"
      >
        <SectionLabel>7 — SHARE TO</SectionLabel>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition hover:border-white/[0.1]">
            <input
              type="checkbox"
              checked={share.public}
              onChange={(e) => setShare({ ...share, public: e.target.checked })}
              className="h-4 w-4 rounded accent-fc-red"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
              MY PROFILE (public)
            </span>
          </label>

          {myClubs.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
                Share to clubs:
              </p>
              <div className="space-y-2">
                {myClubs.map((club) => (
                  <label
                    key={club.id}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-2.5 transition hover:border-white/[0.1]"
                  >
                    <input
                      type="checkbox"
                      checked={share.selectedClubs.has(club.id)}
                      onChange={(e) => {
                        const next = new Set(share.selectedClubs);
                        if (e.target.checked) next.add(club.id);
                        else next.delete(club.id);
                        setShare({ ...share, selectedClubs: next });
                      }}
                      className="h-4 w-4 rounded accent-fc-red"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                      {club.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {myClubs.length === 0 && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
              Join a club to share here
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   LOG BAR — the finale button
   ============================================================ */
function LogBar({
  clubs,
  onLog,
  saving,
}: {
  clubs: { id: string; name: string }[];
  onLog: () => void;
  saving: boolean;
}) {
  return (
    <section className="sticky bottom-0 left-0 right-0 border-t border-white/[0.08] bg-gradient-to-t from-[#0E0D18] via-[#0E0D18] to-[#0E0D18]/80 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onLog}
          disabled={saving}
          className="w-full rounded-xl bg-fc-red px-6 py-3 font-anton text-[13px] font-black uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_rgba(255,74,74,0.4)] transition disabled:opacity-60 hover:shadow-[0_12px_32px_rgba(255,74,74,0.5)]"
        >
          {saving ? "LOGGING…" : "LOG"}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 font-anton text-[13px] font-black uppercase tracking-[0.2em] text-[#F4EFD8]">
      {children}
    </h3>
  );
}
