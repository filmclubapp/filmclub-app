"use client";

/* ============================================================
   FILM CLUB — REVIEW DETAIL
   The full breakdown of a single review.
   Tappable from any Film Card on home, friends, trending, tonight.
   ============================================================ */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const RED = "#FF4A4A";

const poster = (from: string, via: string, to: string, hi: string) =>
  `radial-gradient(130% 85% at 15% 10%, ${hi}55 0%, transparent 55%),
   radial-gradient(120% 110% at 85% 110%, ${to}85 0%, transparent 60%),
   linear-gradient(155deg, ${from} 0%, ${via} 45%, ${to} 100%)`;

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

interface ReviewDetail {
  id: string;
  user: { name: string; handle: string; initial: string; bg: string; streak: number; followers: string };
  film: { title: string; director: string; year: string; runtime: string; genre: string; country: string };
  poster: string;
  tmdbPoster?: string;
  accent: string;
  ghost: string;
  fcScore: number;
  categoryScores: { label: string; value: number }[];
  tags: string[];
  watchedAt: string;
  rewatchCount: number;
  headline: string;
  body: string[];
  reactions: { emoji: string; count: number; mine?: boolean }[];
  comments: {
    id: string;
    user: string;
    initial: string;
    bg: string;
    time: string;
    text: string;
    likes: number;
  }[];
  alsoRated: { name: string; initial: string; bg: string; score: number }[];
}

const REVIEWS: Record<string, ReviewDetail> = {
  "fy-1": {
    id: "fy-1",
    user: { name: "LUCIA_R", handle: "@lucia.reels", initial: "L", bg: "#4A1C2C", streak: 12, followers: "2.4K" },
    film: { title: "Parasite", director: "Bong Joon-ho", year: "2019", runtime: "2h 12m", genre: "Thriller", country: "South Korea" },
    poster: poster("#140824", "#2d0a18", "#05070f", "#a065ff"),
    tmdbPoster: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    accent: "#D4A3FF",
    ghost: "92",
    fcScore: 9.2,
    categoryScores: [
      { label: "FEEL", value: 9.4 },
      { label: "PULL", value: 9.6 },
      { label: "CRAFT", value: 9.8 },
      { label: "PERF", value: 9.0 },
      { label: "REPLAY", value: 8.4 },
    ],
    tags: ["First Watch", "Hot Take"],
    watchedAt: "2h ago · home cinema",
    rewatchCount: 0,
    headline: "Cinema as class warfare. Nothing else comes close.",
    body: [
      "I went in cold. Two hours later I was on the floor.",
      "Bong's masterstroke is structural — the staircase isn't a metaphor, it IS the film. Every cut down is a cut down. Every cut up is a lie.",
      "The basement reveal genuinely made me gasp. I haven't gasped at a film since I was a kid.",
      "If this isn't the best film of the decade I'll eat my Letterboxd account.",
    ],
    reactions: [
      { emoji: "🔥", count: 284, mine: true },
      { emoji: "🤯", count: 142 },
      { emoji: "👁", count: 58 },
      { emoji: "💯", count: 33 },
    ],
    comments: [
      {
        id: "c1",
        user: "MARIA_C",
        initial: "M",
        bg: "#5c2a3a",
        time: "1h",
        text: "The peach scene. The PEACH SCENE. I'm still not over it.",
        likes: 24,
      },
      {
        id: "c2",
        user: "JORDAN_FC",
        initial: "J",
        bg: "#2a3d4a",
        time: "45m",
        text: "Hot take respected. 9.2 feels right. Anything lower is cowardice.",
        likes: 18,
      },
      {
        id: "c3",
        user: "REEL_GHOST",
        initial: "R",
        bg: "#3a1a2a",
        time: "20m",
        text: "Watched it again last night. The flood scene hits different on rewatch.",
        likes: 9,
      },
    ],
    alsoRated: [
      { name: "MARIA", initial: "M", bg: "#5c2a3a", score: 9.4 },
      { name: "SOFIA", initial: "S", bg: "#2a4a3a", score: 8.9 },
      { name: "JORDAN", initial: "J", bg: "#2a3d4a", score: 9.0 },
    ],
  },
  // Default for any other id we route to
  default: {
    id: "default",
    user: { name: "FILM_CLUB", handle: "@filmclub", initial: "F", bg: "#3a2a4a", streak: 1, followers: "—" },
    film: { title: "Untitled", director: "Unknown", year: "2026", runtime: "—", genre: "—", country: "—" },
    poster: poster("#1a1028", "#28100a", "#050f0a", "#ffb36b"),
    accent: "#FFD1A0",
    ghost: "00",
    fcScore: 0,
    categoryScores: [
      { label: "FEEL", value: 0 },
      { label: "PULL", value: 0 },
      { label: "CRAFT", value: 0 },
      { label: "PERF", value: 0 },
      { label: "REPLAY", value: 0 },
    ],
    tags: [],
    watchedAt: "—",
    rewatchCount: 0,
    headline: "Review not found.",
    body: ["This review doesn't exist yet. Tap back to the feed."],
    reactions: [],
    comments: [],
    alsoRated: [],
  },
};

function formatFc(score: number) {
  const s = score.toFixed(1);
  const [int, dec] = s.split(".");
  return { int, dec };
}

function IconBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
    </svg>
  );
}
function IconBookmark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h12v18l-6-4-6 4V3z" />
    </svg>
  );
}

export default function ReviewDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || "default";
  const review = REVIEWS[id] || REVIEWS["fy-1"];
  const { int, dec } = formatFc(review.fcScore);

  const [followed, setFollowed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reactions, setReactions] = useState(review.reactions);

  const tapReact = (emoji: string) => {
    setReactions((rs) =>
      rs.map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.mine ? r.count - 1 : r.count + 1, mine: !r.mine }
          : r
      )
    );
  };

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: BG, color: INK }}>
      <div className="relative mx-auto max-w-[480px]">
        {/* ============== HERO POSTER ============== */}
        <section className="relative">
          <div className="relative h-[560px] w-full overflow-hidden">
            <div className="absolute inset-0" style={{ background: review.poster }} />
            {review.tmdbPoster && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${TMDB_IMG}${review.tmdbPoster})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                }}
              />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_35%,transparent_25%,rgba(0,0,0,0.65)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-[#05050d] via-[#05050d]/85 to-transparent" />

            {/* ghost */}
            <div
              className="pointer-events-none absolute -bottom-6 -right-3 select-none font-anton leading-[0.78] text-white/[0.06]"
              style={{ fontSize: 360, letterSpacing: "-0.04em" }}
            >
              {review.ghost}
            </div>

            {/* nav row */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <Link
                href="/home"
                aria-label="Back"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/10 hover:bg-black/55"
              >
                <IconBack />
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSaved((s) => !s)}
                  aria-label="Save"
                  className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md ring-1 ring-white/10 ${
                    saved ? "bg-fc-red text-white" : "bg-black/40 text-white"
                  }`}
                >
                  <IconBookmark />
                </button>
                <button
                  type="button"
                  aria-label="Share"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/10 hover:bg-black/55"
                >
                  <IconShare />
                </button>
              </div>
            </div>

            {/* content */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px w-8 bg-fc-red" />
                <span className="font-mono text-[8px] uppercase tracking-[0.28em] text-fc-red/90">
                  {review.tags.join(" · ") || "Review"}
                </span>
              </div>

              <h1
                className="font-anton text-white"
                style={{ fontSize: 50, lineHeight: 0.86, letterSpacing: "0.01em" }}
              >
                {review.film.title.toUpperCase()}
              </h1>

              <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-white/45">
                {review.film.director} · {review.film.year} · {review.film.runtime} · {review.film.country}
              </p>

              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="font-anton text-[58px] leading-none text-fc-red">{int}</span>
                  <span className="font-anton text-[28px] text-fc-red/75">.{dec}</span>
                </div>
                <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-white/65 backdrop-blur-sm">
                  {review.watchedAt}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============== USER STRIP ============== */}
        <section className="relative -mt-2 px-4">
          <div className="flex items-center gap-3 rounded-[18px] border border-white/[0.06] bg-[#17162A] px-4 py-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-anton text-xl text-white ring-2 ring-fc-red/40"
              style={{ backgroundColor: review.user.bg }}
            >
              {review.user.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-anton text-[15px] tracking-wide text-white">
                {review.user.name}
              </p>
              <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/45">
                <span>{review.user.handle}</span>
                <span className="text-white/20">·</span>
                <span>{review.user.followers} followers</span>
                <span className="text-white/20">·</span>
                <span className="text-fc-red/80">🔥 {review.user.streak}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFollowed((f) => !f)}
              className={`shrink-0 rounded-full px-4 py-2 font-anton text-[10px] tracking-[0.16em] transition-all ${
                followed
                  ? "border border-white/15 bg-white/[0.06] text-[#F4EFD8]/65"
                  : "bg-fc-red text-white shadow-[0_6px_18px_rgba(255,74,74,0.35)]"
              }`}
            >
              {followed ? "FOLLOWING" : "FOLLOW"}
            </button>
          </div>
        </section>

        {/* ============== FC SCORE BREAKDOWN ============== */}
        <section className="mt-5 px-4">
          <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/80">
            ◉ The FC Rating
          </p>
          <div className="rounded-[18px] border border-white/[0.06] bg-[#17162A] px-4 py-4">
            <div className="grid grid-cols-5 gap-2">
              {review.categoryScores.map((c) => {
                const pct = (c.value / 10) * 100;
                return (
                  <div key={c.label} className="flex flex-col items-center">
                    <div className="relative h-16 w-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-full bg-fc-red"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 font-anton text-[16px] leading-none text-white">
                      {c.value.toFixed(1)}
                    </p>
                    <p className="mt-1 font-mono text-[6.5px] uppercase tracking-[0.16em] text-white/40">
                      {c.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============== REVIEW BODY ============== */}
        <section className="mt-6 px-5">
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/80">
            ◉ The take
          </p>
          <h2
            className="mt-2 font-anton text-cream"
            style={{ fontSize: 26, lineHeight: 0.96, letterSpacing: "0.005em" }}
          >
            “{review.headline}”
          </h2>
          <div className="mt-4 space-y-3">
            {review.body.map((p, i) => (
              <p key={i} className="font-sans text-[14px] leading-[1.6] text-[#F4EFD8]/75">
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* ============== REACTIONS ============== */}
        <section className="mt-6 px-4">
          <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/80">
            ◉ React
          </p>
          <div className="flex flex-wrap gap-2">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => tapReact(r.emoji)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all ${
                  r.mine
                    ? "border-fc-red/60 bg-fc-red/15 text-fc-red"
                    : "border-white/10 bg-white/[0.04] text-[#F4EFD8]/65 hover:border-white/25"
                }`}
              >
                <span className="text-[16px] leading-none">{r.emoji}</span>
                <span className="font-mono text-[10px] tracking-wide">{r.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ============== ALSO RATED ============== */}
        {review.alsoRated.length > 0 && (
          <section className="mt-6 px-4">
            <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/80">
              ◉ Friends who rated this
            </p>
            <div className="space-y-2">
              {review.alsoRated.map((f) => {
                const { int, dec } = formatFc(f.score);
                return (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-[#17162A] px-3 py-2.5"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full font-anton text-sm text-white"
                      style={{ backgroundColor: f.bg }}
                    >
                      {f.initial}
                    </span>
                    <p className="flex-1 font-anton text-[13px] tracking-wide text-white">
                      {f.name}
                    </p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-anton text-[18px] leading-none text-fc-red">{int}</span>
                      <span className="font-anton text-[10px] text-fc-red/75">.{dec}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============== COMMENTS ============== */}
        <section className="mt-6 px-4">
          <div className="mb-3 flex items-end justify-between">
            <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red/80">
              ◉ Comments
            </p>
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/40">
              {review.comments.length}
            </span>
          </div>
          <div className="space-y-3">
            {review.comments.map((c) => (
              <div key={c.id} className="flex gap-3 rounded-2xl border border-white/[0.05] bg-[#17162A] px-3.5 py-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-anton text-sm text-white"
                  style={{ backgroundColor: c.bg }}
                >
                  {c.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-anton text-[12px] tracking-wide text-white">{c.user}</p>
                    <p className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/35">
                      {c.time}
                    </p>
                  </div>
                  <p className="mt-1 font-sans text-[12.5px] leading-snug text-[#F4EFD8]/75">
                    {c.text}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35 hover:text-fc-red"
                    >
                      ♡ {c.likes}
                    </button>
                    <button
                      type="button"
                      className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35 hover:text-white/70"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============== STICKY COMPOSER ============== */}
        <div
          className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-white/[0.05] px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"
          style={{ backgroundColor: `${BG}F5` }}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 bg-transparent font-sans text-[13px] text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-fc-red text-white shadow-[0_6px_18px_rgba(255,74,74,0.4)]"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M2 12l20-9-9 20-2-9-9-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
