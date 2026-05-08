"use client";

/*
  FILMS THAT CHANGED MY LIFE
  ══════════════════════════
  Design system: Films In My Head Series
  — Anton for titles (massive)
  — DM Mono for labels / counters
  — DM Sans italic for loglines
  — Mood-specific background tones per film
  — TMDB backdrop loaded at runtime; falls back to placeholder
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { backdropURL } from "../lib/tmdb";

/* ── Palette tokens ─────────────────────────────────────────── */
const BRAND_RED = "#ff5757";
const INK       = "#1a0c0c";
const MUTED     = "#9a7a6a";

/* ── Film definitions ───────────────────────────────────────── */
interface FilmEntry {
  index:      number;          // 01, 02, …
  tmdbId:     number;
  title:      string;
  titleSize:  "xl" | "lg" | "md" | "sm"; // drives font-size
  tags:       string;          // displayed as MOOD · MOOD · MOOD
  logline:    string;
  /** Key words to bold inside the logline */
  bold:       string[];
  mood:       string;          // CSS class key
  /** HSL background colour for this card */
  bg:         string;
  /** Subtle gradient overlay colour (rgb) */
  gradientRgb: string;
}

const FILMS: FilmEntry[] = [
  {
    index:       1,
    tmdbId:      16869,
    title:       "THE NOTEBOOK",
    titleSize:   "lg",
    tags:        "LOVE · HEARTBREAK · TIME · MEMORY",
    logline:     "one of the most beautiful and soul-crushing stories in cinema. 10/10 do not recommend.",
    bold:        ["soul-crushing", "10/10 do not recommend"],
    mood:        "love",
    bg:          "#ecdde8",
    gradientRgb: "236, 221, 232",
  },
  {
    index:       2,
    tmdbId:      831814,
    title:       "C'MON C'MON",
    titleSize:   "lg",
    tags:        "INTIMACY · CHILDHOOD · CONNECTION · QUIET",
    logline:     "an immensely special and personal film that has never left my mind despite not having seen it in a year.",
    bold:        ["never left my mind"],
    mood:        "quiet",
    bg:          "#d8e2ea",
    gradientRgb: "216, 226, 234",
  },
  {
    index:       3,
    tmdbId:      14160,
    title:       "UP",
    titleSize:   "xl",
    tags:        "LOVE · LOSS · WONDER · ADVENTURE",
    logline:     "this is so simple and pure and is a prime example of Pixar's miraculously efficient yet affecting storytelling.",
    bold:        ["miraculously efficient yet affecting"],
    mood:        "wonder",
    bg:          "#f0edd4",
    gradientRgb: "240, 237, 212",
  },
  {
    index:       4,
    tmdbId:      776,
    title:       "IT'S A WONDERFUL LIFE",
    titleSize:   "sm",
    tags:        "HUMANITY · GRATITUDE · WONDER · LIFE",
    logline:     "so deeply human in a way that very few films ever have been.",
    bold:        ["so deeply human"],
    mood:        "warmth",
    bg:          "#ede0cc",
    gradientRgb: "237, 224, 204",
  },
  {
    index:       5,
    tmdbId:      490132,
    title:       "GREEN BOOK",
    titleSize:   "lg",
    tags:        "FRIENDSHIP · HUMOUR · HUMANITY · HEART",
    logline:     "a true masterclass in heart, humour, and humanity — one of the rare times I could have rewatched as soon as it ended. This film has stuck by me.",
    bold:        ["masterclass", "stuck by me"],
    mood:        "heart",
    bg:          "#f0e4d0",
    gradientRgb: "240, 228, 208",
  },
];

/* ── Title size classes ─────────────────────────────────────── */
const TITLE_CLASSES: Record<FilmEntry["titleSize"], string> = {
  xl: "text-[clamp(7rem,22vw,120px)]",   // single short word — UP
  lg: "text-[clamp(4.8rem,15vw,88px)]",  // 2–3 words
  md: "text-[clamp(3.8rem,12vw,72px)]",  // 3–4 words
  sm: "text-[clamp(3rem,9.5vw,58px)]",   // long titles
};

/* ── Render bold spans inside a logline ─────────────────────── */
function BoldLogline({ text, bold }: { text: string; bold: string[] }) {
  if (!bold.length) return <>{text}</>;
  const pattern = new RegExp(`(${bold.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        bold.some((b) => b.toLowerCase() === part.toLowerCase())
          ? <span key={i} className="not-italic font-normal" style={{ color: INK }}>{part}</span>
          : part
      )}
    </>
  );
}

/* ── Backdrop loader hook ───────────────────────────────────── */
function useBackdropPaths(films: FilmEntry[]) {
  const [paths, setPaths] = useState<Record<number, string | null>>({});

  useEffect(() => {
    const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!TMDB_KEY) return;

    Promise.all(
      films.map(async (f) => {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${f.tmdbId}?api_key=${TMDB_KEY}`
          );
          const data = await res.json();
          return [f.tmdbId, data.backdrop_path ?? null] as [number, string | null];
        } catch {
          return [f.tmdbId, null] as [number, string | null];
        }
      })
    ).then((pairs) => {
      setPaths(Object.fromEntries(pairs));
    });
  }, [films]);

  return paths;
}

/* ══════════════════════════════════════════════════════════════
   FILM CARD
   ══════════════════════════════════════════════════════════════ */
function FilmCard({
  film,
  backdropPath,
  isLast,
}: {
  film: FilmEntry;
  backdropPath: string | null | undefined;
  isLast: boolean;
}) {
  const totalCount = FILMS.length;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: "680px",
        backgroundColor: film.bg,
        marginBottom: isLast ? 0 : "2px",
      }}
    >
      {/* ── Top image zone (58% height) ──────────────────────── */}
      <div className="absolute left-0 right-0 top-0" style={{ height: "58%" }}>
        {backdropPath ? (
          <Image
            src={backdropURL(backdropPath, "w1280")}
            alt={film.title}
            fill
            className="object-cover object-top"
            sizes="540px"
            priority={film.index === 1}
          />
        ) : (
          /* Placeholder matching the original HTML design */
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <span
              className="text-[22px] font-light leading-none"
              style={{ color: `rgba(154,122,106,0.25)`, fontFamily: "DM Sans, sans-serif" }}
            >
              +
            </span>
            <span
              className="font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: `rgba(154,122,106,0.35)` }}
            >
              ADD IMAGE
            </span>
          </div>
        )}
      </div>

      {/* ── Gradient fade image → background ─────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            transparent 0%,
            transparent 46%,
            rgba(${film.gradientRgb}, 0.32) 60%,
            rgba(${film.gradientRgb}, 0.82) 72%,
            rgba(${film.gradientRgb}, 0.96) 80%,
            ${film.bg} 90%
          )`,
          zIndex: 2,
        }}
      />

      {/* ── Bottom dark vignette on image ────────────────────── */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: "58%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.055) 100%)",
          zIndex: 3,
        }}
      />

      {/* ── FILM CLUB brand mark ──────────────────────────────── */}
      <div
        className="absolute left-[22px] top-[20px] z-10 font-anton text-[10px] uppercase tracking-[0.24em]"
        style={{ color: `rgba(255,87,87,0.75)` }}
      >
        FILM CLUB
      </div>

      {/* ── Counter top-right ─────────────────────────────────── */}
      <div
        className="absolute right-[22px] top-[22px] z-10 text-right font-mono text-[7.5px] uppercase leading-[1.6] tracking-[0.18em]"
        style={{ color: `rgba(154,122,106,0.55)` }}
      >
        Films That Changed My Life<br />
        {String(film.index).padStart(2, "0")} / {String(totalCount).padStart(2, "0")}
      </div>

      {/* ── Film content (tags, title, rule, logline) ─────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-7 pb-9"
      >
        {/* Tags */}
        <p
          className="mb-[10px] flex items-center gap-[6px] font-mono text-[8px] uppercase tracking-[0.22em]"
          style={{ color: `rgba(154,122,106,0.85)` }}
        >
          <span
            className="inline-block"
            style={{
              width: "12px",
              height: "0.5px",
              backgroundColor: `rgba(154,122,106,0.45)`,
              flexShrink: 0,
            }}
          />
          {film.tags}
        </p>

        {/* Title — massive Anton */}
        <h2
          className={`font-anton uppercase leading-[0.88] tracking-[0.01em] ${TITLE_CLASSES[film.titleSize]}`}
          style={{ color: INK, marginBottom: "16px" }}
        >
          {film.title}
        </h2>

        {/* Red accent rule */}
        <div
          style={{
            width: "28px",
            height: "1.5px",
            backgroundColor: BRAND_RED,
            opacity: 0.65,
            marginBottom: "14px",
          }}
        />

        {/* Logline — bigger than original, italic DM Sans */}
        <p
          className="font-sans text-[15px] font-light italic leading-[1.75] tracking-[0.008em]"
          style={{ color: `rgba(26,12,12,0.58)` }}
        >
          <BoldLogline text={film.logline} bold={film.bold} />
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════ */
export default function FilmsThatChangedMyLifePage() {
  const backdropPaths = useBackdropPaths(FILMS);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fdf9e3" }}>
      <div className="mx-auto max-w-[480px]">

        {/* ── Page header ─────────────────────────────────────── */}
        <header
          className="px-6 pb-8 pt-12"
          style={{ backgroundColor: "#fdf9e3" }}
        >
          {/* Series label */}
          <div
            className="mb-5 flex items-center gap-3 font-mono text-[8.5px] uppercase tracking-[0.28em]"
            style={{ color: `rgba(154,122,106,0.5)` }}
          >
            <span style={{ width: "28px", height: "0.5px", backgroundColor: `rgba(154,122,106,0.3)`, display: "inline-block" }} />
            FILMS THAT CHANGED MY LIFE
            <span style={{ width: "28px", height: "0.5px", backgroundColor: `rgba(154,122,106,0.3)`, display: "inline-block" }} />
          </div>

          {/* Cover headline */}
          <h1
            className="font-anton text-[clamp(4.2rem,16vw,78px)] uppercase leading-[0.88] tracking-[0.01em]"
            style={{ color: INK }}
          >
            MOVIES
            <br />
            <span style={{ color: BRAND_RED }}>THAT</span>
            <br />
            STAYED.
          </h1>

          {/* Red rule */}
          <div style={{ width: "36px", height: "2px", backgroundColor: BRAND_RED, opacity: 0.7, marginTop: "18px", marginBottom: "14px" }} />

          {/* Subtitle */}
          <p
            className="font-sans text-[14px] font-light italic leading-[1.65] tracking-[0.015em]"
            style={{ color: `rgba(26,12,12,0.42)` }}
          >
            Not a ranking. Not a list.<br />
            These are the films that left a mark — the ones that shaped how I see love, grief, wonder, and what it means to be here.
          </p>

          {/* Film count */}
          <p
            className="mt-5 font-mono text-[8px] uppercase tracking-[0.2em]"
            style={{ color: `rgba(154,122,106,0.55)` }}
          >
            {FILMS.length} films · personal series
          </p>
        </header>

        {/* ── Film cards ──────────────────────────────────────── */}
        <main>
          {FILMS.map((film, i) => (
            <FilmCard
              key={film.tmdbId}
              film={film}
              backdropPath={backdropPaths[film.tmdbId]}
              isLast={i === FILMS.length - 1}
            />
          ))}
        </main>

        {/* ── Footer CTA ──────────────────────────────────────── */}
        <footer
          className="flex flex-col items-center gap-4 px-6 py-14"
          style={{ backgroundColor: "#fdf9e3" }}
        >
          <div
            className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.28em]"
            style={{ color: `rgba(154,122,106,0.45)` }}
          >
            <span style={{ width: "28px", height: "0.5px", backgroundColor: `rgba(154,122,106,0.25)`, display: "inline-block" }} />
            FILM CLUB
            <span style={{ width: "28px", height: "0.5px", backgroundColor: `rgba(154,122,106,0.25)`, display: "inline-block" }} />
          </div>

          <p
            className="text-center font-sans text-[13px] font-light italic leading-relaxed"
            style={{ color: `rgba(26,12,12,0.38)` }}
          >
            What films have stayed with you?
          </p>

          <Link
            href="/log"
            className="rounded-full px-7 py-3 font-mono text-[9px] uppercase tracking-[0.2em] transition active:scale-[0.97]"
            style={{
              backgroundColor: `rgba(255,87,87,0.1)`,
              border: `0.5px solid rgba(255,87,87,0.3)`,
              color: BRAND_RED,
            }}
          >
            LOG A FILM →
          </Link>

          <Link
            href="/home"
            className="font-mono text-[8px] uppercase tracking-[0.18em]"
            style={{ color: `rgba(154,122,106,0.4)` }}
          >
            ← Back to Film Club
          </Link>
        </footer>

      </div>
    </div>
  );
}
