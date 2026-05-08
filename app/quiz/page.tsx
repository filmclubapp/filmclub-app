"use client";

/*
  FILM CLUB — Identity Quiz + ID Card
  ════════════════════════════════════════════════════════════════
  Flow:
    0  → Intro
    1–5 → Questions
    6  → Top 3 films (TMDB search + posters)
    7  → Reveal + ID card + download
    8  → Create account
    9  → Done
*/

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

/* ── Design tokens ──────────────────────────────────────────── */
const BG  = "#0d0c16";
const RED = "#FF4A4A";
const DNA_AXES = ["VISUAL", "PACE", "EMOTION", "INTELLECT", "SOUL"];
const TMDB_KEY   = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? "";
const TMDB_IMG   = "https://image.tmdb.org/t/p/w342";
// Proxy through our own API to avoid cross-origin image issues
const posterSrc  = (path: string | null) =>
  path ? `/api/tmdb-image?path=${encodeURIComponent(path)}&size=w342` : "";

/* ── Film pick ──────────────────────────────────────────────── */
interface FilmPick {
  title:      string;
  year:       string;
  posterPath: string | null;
  tmdbId:     number | null;
}
const emptyPick = (): FilmPick => ({ title: "", year: "", posterPath: null, tmdbId: null });

/* ── TMDB result ────────────────────────────────────────────── */
interface TMDBResult {
  id:           number;
  title:        string;
  release_date: string;
  poster_path:  string | null;
}

/* ── Archetype ──────────────────────────────────────────────── */
interface Archetype {
  id:      string;
  name:    string;
  tagline: string;
  desc:    string;
  tags:    string[];
  cardBg:  string;   // dark background variation
  radarAc: string;   // subtle radar tint (not card chrome)
  films:   string[]; // fallback if user doesn't pick
  dna:     number[]; // [Visual, Pace, Emotion, Intellect, Soul]
}

const ARCHETYPES: Archetype[] = [
  {
    id:      "neon-noirist",
    name:    "NEON NOIRIST",
    tagline: "chases beauty in the dark",
    desc:    "You see what others miss. The way light falls through a window at 2am. The pause before someone says something they can't take back. You were drawn to cinema because it's the only place that holds darkness the way you do - not as something to fix, but as something to inhabit. You don't need the film to end well. You need it to end honestly.",
    tags:    ["ATMOSPHERE", "MORAL COMPLEXITY", "VISUAL TENSION"],
    cardBg:  "#0e1020",
    radarAc: "#6470d4",
    films:   ["Drive", "Nightcrawler", "Blade Runner 2049"],
    dna:     [9.6, 5.2, 6.8, 7.4, 8.9],
  },
  {
    id:      "emotional-architect",
    name:    "EMOTIONAL ARCHITECT",
    tagline: "builds feeling with ruthless precision",
    desc:    "You experience emotion like architecture - you feel it and simultaneously understand its structure. A film breaks you and you know exactly which scene, which note, which cut did it. People watch for the story. You watch for the precise moment a human being becomes completely real on screen. You carry films in your body long after the credits roll.",
    tags:    ["CHARACTER DEPTH", "EMOTIONAL TRUTH", "HUMAN DRAMA"],
    cardBg:  "#140820",
    radarAc: "#c084fc",
    films:   ["Waves", "Moonlight", "Marriage Story"],
    dna:     [7.2, 6.0, 9.8, 8.4, 9.1],
  },
  {
    id:      "slow-burn",
    name:    "THE SLOW BURN",
    tagline: "lets silence do the work",
    desc:    "Silence doesn't make you anxious - it makes you pay attention. You have the rarest gift in cinema: patience. While others reach for their phones, you're noticing how long the camera holds on an empty room, what that means, what it costs the character to stay in it. You understand that in the right film, nothing happening is everything happening.",
    tags:    ["PATIENCE", "ATMOSPHERE", "QUIET INTENSITY"],
    cardBg:  "#081420",
    radarAc: "#7aa2c0",
    films:   ["Lost in Translation", "Before Sunrise", "Paterson"],
    dna:     [8.1, 3.5, 8.6, 7.8, 9.4],
  },
  {
    id:      "cosmic-romantic",
    name:    "COSMIC ROMANTIC",
    tagline: "love on a scale that breaks you",
    desc:    "You believe love is the most cinematic thing that exists - not the easy kind, but the kind that costs something. The kind that survives time, distance, death, regret. You watch films about love not to escape your life but to understand it. Every great love story you've ever seen has left a specific mark on you. You can still feel all of them.",
    tags:    ["LOVE", "SCALE", "BITTERSWEET TRUTH"],
    cardBg:  "#1a0814",
    radarAc: "#e078a0",
    films:   ["Eternal Sunshine", "Her", "Call Me By Your Name"],
    dna:     [7.6, 6.5, 9.5, 6.8, 9.7],
  },
  {
    id:      "concrete-realist",
    name:    "CONCRETE REALIST",
    tagline: "no gloss. just truth",
    desc:    "You have no patience for gloss. The most powerful thing a film can do is make you forget you're watching one - when it moves exactly like life moves, messy and unresolved and true. You trust films that trust their audience enough not to explain everything. Sentiment feels like a lie to you. Earned feeling is everything.",
    tags:    ["RAW TRUTH", "SOCIAL REALISM", "NO SENTIMENTALITY"],
    cardBg:  "#081408",
    radarAc: "#70a050",
    films:   ["Parasite", "Ladybird", "Fish Tank"],
    dna:     [6.4, 7.2, 8.8, 8.6, 7.5],
  },
  {
    id:      "genre-subverter",
    name:    "GENRE SUBVERTER",
    tagline: "watches genre to watch it break",
    desc:    "You've always watched films one level above everyone else. You clock the genre signals, the expected beats - and what you love is the director who knows you're clocking them and decides to do something else entirely. You love cinema that is in conversation with itself. The setup only exists because you both know what it's for, and you're both about to break it.",
    tags:    ["SUBVERSION", "WIT", "BRAVE STORYTELLING"],
    cardBg:  "#081818",
    radarAc: "#38b2a0",
    films:   ["Get Out", "The Favourite", "Everything Everywhere"],
    dna:     [7.8, 7.5, 7.2, 9.2, 7.6],
  },
  {
    id:      "auteur-devotee",
    name:    "THE AUTEUR DEVOTEE",
    tagline: "follows the director, not the film",
    desc:    "You see the director's hand in everything. The length of a shot. The placement of a body in a frame. The decision to cut here and not a second later. You've fallen into filmographies the way other people fall into relationships - completely, obsessively, with total commitment. You don't just watch films. You study them. And what you're studying is how a singular mind sees the world.",
    tags:    ["CRAFT", "DIRECTORIAL VISION", "VISUAL LANGUAGE"],
    cardBg:  "#080c18",
    radarAc: "#60a8d0",
    films:   ["There Will Be Blood", "2001", "The Master"],
    dna:     [9.4, 6.8, 7.1, 9.6, 8.2],
  },
  {
    id:      "deadpan",
    name:    "THE DEADPAN",
    tagline: "warm underneath the cool",
    desc:    "Warmth disguised as cool - that's you. You gravitate toward films that hold you at arm's length and then, when you least expect it, wreck you completely. You appreciate the craft of keeping a perfectly straight face while something devastating is happening. People who love the same films as you become your people immediately. The sense of humour is specific. So is the sadness underneath it.",
    tags:    ["DRY WIT", "PRECISION", "WARM IRONY"],
    cardBg:  "#0e100e",
    radarAc: "#a0b890",
    films:   ["Fantastic Mr Fox", "Frances Ha", "The Lobster"],
    dna:     [9.1, 5.8, 6.4, 8.8, 7.2],
  },
];

/* ── Questions ──────────────────────────────────────────────── */
interface Answer   { label: string; scores: number[] }
interface Question { id: number; prompt: string; sub: string; answers: Answer[] }

/*
  Scoring indices: [NOIRIST, EMOTIONAL, SLOW_BURN, COSMIC, REALIST, SUBVERTER, AUTEUR, DEADPAN]

  Design principle: each answer gives 2pts to ONE primary archetype, at most 1pt secondary.
  No archetype should accumulate secondary scores across multiple questions — that was
  causing AUTEUR DEVOTEE to dominate even for non-auteur answers.
*/
const QUESTIONS: Question[] = [
  {
    id: 1,
    prompt: "It's 7pm. You're picking a film alone. What do you reach for?",
    sub: "be honest - this is just between us",
    answers: [
      { label: "Something dark and beautiful — atmosphere first",       scores: [2,0,0,0,0,0,0,0] }, // NOIRIST
      { label: "Something that's going to make me feel something real", scores: [0,2,0,0,0,0,0,0] }, // EMOTIONAL
      { label: "Something quiet that takes its time",                   scores: [0,0,2,0,0,0,0,0] }, // SLOW BURN
      { label: "Something sweeping — love, time, scale",               scores: [0,0,0,2,0,0,0,0] }, // COSMIC
      { label: "Real life. No gloss. No convenient ending",            scores: [0,0,0,0,2,0,0,0] }, // REALIST
      { label: "Something strange — I want to be surprised by it",     scores: [0,0,0,0,0,2,0,1] }, // SUBVERTER + hint DEADPAN
    ],
  },
  {
    id: 2,
    prompt: "A film ends. Screen goes black. What's the best feeling?",
    sub: "the moment after is everything",
    answers: [
      { label: "Sitting in silence, unable to move",                    scores: [0,0,2,0,0,0,0,0] }, // SLOW BURN
      { label: "Feeling like I just lived something, not watched it",   scores: [0,2,0,0,1,0,0,0] }, // EMOTIONAL + hint REALIST
      { label: "Thinking about one shot for the next three days",       scores: [0,0,0,0,0,0,2,0] }, // AUTEUR
      { label: "Needing to call someone and tell them to watch it",     scores: [0,0,0,2,0,0,0,0] }, // COSMIC
      { label: "Wanting to rewatch immediately to catch what I missed", scores: [0,0,0,0,0,2,0,0] }, // SUBVERTER
      { label: "Slightly disoriented — and I love it",                  scores: [1,0,0,0,0,0,0,2] }, // DEADPAN + hint NOIRIST
    ],
  },
  {
    id: 3,
    prompt: "Which setup pulls you in immediately?",
    sub: "the first scene that makes you stop reaching for your phone",
    answers: [
      { label: "Neon city. Rain. A character who sees too much",                        scores: [2,0,0,0,0,0,0,0] }, // NOIRIST
      { label: "Two people in a kitchen having the hardest conversation of their lives", scores: [0,2,0,0,1,0,0,0] }, // EMOTIONAL + hint REALIST
      { label: "A landscape held for 90 seconds. No dialogue. Nothing explained",       scores: [0,0,1,0,0,0,2,0] }, // AUTEUR + hint SLOW BURN
      { label: "Vast and sweeping — a love story across years",                         scores: [0,0,0,2,0,0,0,0] }, // COSMIC
      { label: "A hand-held camera following someone through an ordinary Tuesday",      scores: [0,0,0,0,2,0,0,0] }, // REALIST
      { label: "A genre film that immediately signals it's about to break genre",       scores: [0,0,0,0,0,2,0,1] }, // SUBVERTER + hint DEADPAN
    ],
  },
  {
    id: 4,
    prompt: "You're watching a new film. What do you notice first?",
    sub: "your instinct, not what you think you should say",
    answers: [
      { label: "The light. How every frame was chosen",                               scores: [0,0,0,0,0,0,2,0] }, // AUTEUR
      { label: "The actor's face — what they're not saying",                          scores: [0,2,0,0,0,0,0,0] }, // EMOTIONAL
      { label: "Whether it feels true. Whether this could be someone's actual life",  scores: [0,0,0,0,2,0,0,0] }, // REALIST
      { label: "The genre signals — whether the film's about to break them",          scores: [0,0,0,0,0,2,0,0] }, // SUBVERTER
      { label: "The world they've built — the neon, the dust, the texture",           scores: [2,0,1,0,0,0,0,0] }, // NOIRIST + hint SLOW BURN
      { label: "The tone — cold and precise, or vast and aching",                     scores: [0,0,0,2,0,0,0,1] }, // COSMIC + hint DEADPAN
    ],
  },
  {
    id: 5,
    prompt: "Which statement is closest to how you feel about films?",
    sub: "the one that makes you think 'yes, exactly that'",
    answers: [
      { label: "A film should cost you something",              scores: [0,2,0,0,1,0,0,0] }, // EMOTIONAL + hint REALIST
      { label: "A film should be a place you can live inside",  scores: [1,0,2,0,0,0,0,0] }, // SLOW BURN + hint NOIRIST
      { label: "Every frame should be a deliberate decision",   scores: [0,0,0,0,0,0,2,0] }, // AUTEUR
      { label: "A film should be brave enough to confuse you",  scores: [0,0,0,0,0,1,0,2] }, // DEADPAN + hint SUBVERTER
      { label: "A film should make you feel less alone",        scores: [0,1,0,2,0,0,0,0] }, // COSMIC + hint EMOTIONAL
      { label: "A film should show you what you didn't know you needed to see", scores: [1,0,0,0,0,2,0,0] }, // SUBVERTER + hint NOIRIST
    ],
  },
];

/* ── Helpers ────────────────────────────────────────────────── */
function computeArchetype(answers: number[][]): Archetype {
  const totals = new Array(8).fill(0);
  for (const scores of answers) scores.forEach((s, i) => { totals[i] += s; });
  return ARCHETYPES[totals.indexOf(Math.max(...totals))];
}

async function fetchMemberNumber(): Promise<string> {
  try {
    const res  = await fetch("/api/member-number");
    const data = await res.json() as { formatted?: string };
    return data.formatted ?? "FC-0001";
  } catch {
    return "FC-0001";
  }
}

/* ── Animations ─────────────────────────────────────────────── */
const slideV: Variants = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -30 } };
const fadeV:  Variants = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } };
const slideT = { duration: 0.38, ease: "easeOut" as const };
const fadeT  = { duration: 0.50, ease: "easeOut" as const };

/* ══════════════════════════════════════════════════════════════
   RADAR CHART
   ══════════════════════════════════════════════════════════════ */
function RadarChart({ scores, accent }: { scores: number[]; accent: string }) {
  const cx = 56, cy = 56, r = 36, n = 5, size = 112;
  const pt = (i: number, rad: number): [number, number] => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((lv, li) => (
        <polygon key={li}
          points={Array.from({ length: n }, (_, i) => pt(i, lv * r).join(",")).join(" ")}
          fill="none"
          stroke={li === 3 ? `${accent}50` : "rgba(255,255,255,0.05)"}
          strokeWidth={li === 3 ? 0.8 : 0.4}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const p = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />;
      })}
      <polygon
        points={scores.map((s, i) => pt(i, (s / 10) * r).join(",")).join(" ")}
        fill={`${accent}18`} stroke={accent} strokeWidth={1.5} strokeLinejoin="round" opacity={0.9}
      />
      {scores.map((s, i) => {
        const p = pt(i, (s / 10) * r);
        return <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={accent} />;
      })}
      {DNA_AXES.map((label, i) => {
        const p = pt(i, r * 1.34);
        return (
          <text key={i} x={p[0]} y={p[1]} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.35)" fontSize={5.5} fontFamily="'Courier New',monospace" letterSpacing={0.5}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   FILM SEARCH INPUT (TMDB autocomplete)
   ══════════════════════════════════════════════════════════════ */
function FilmSearchInput({
  index, value, onSelect,
}: {
  index:    number;
  value:    FilmPick;
  onSelect: (pick: FilmPick) => void;
}) {
  const [query,   setQuery]   = useState(value.title);
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent resets
  useEffect(() => { setQuery(value.title); }, [value.title]);

  function search(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      if (!TMDB_KEY) return;
      setLoading(true);
      try {
        const res  = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1&include_adult=false`,
        );
        const data = await res.json();
        setResults((data.results ?? []).slice(0, 6) as TMDBResult[]);
        setOpen(true);
      } catch { /* ignore */ }
      setLoading(false);
    }, 280);
  }

  function pick(r: TMDBResult) {
    const year = r.release_date ? r.release_date.slice(0, 4) : "";
    setQuery(r.title);
    setOpen(false);
    setResults([]);
    onSelect({ title: r.title, year, posterPath: r.poster_path, tmdbId: r.id });
  }

  const placeholders = ["e.g. Moonlight", "e.g. Drive", "e.g. Her"];

  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize: "7.5px", letterSpacing: "0.22em", color: "rgba(232,228,212,0.3)", textTransform: "uppercase", marginBottom: "8px" }}>
        Film {index + 1}
        {value.posterPath && (
          <img
            src={posterSrc(value.posterPath)}
            alt={value.title}
            style={{ display: "inline-block", width: "20px", height: "30px", objectFit: "cover", borderRadius: "2px", marginLeft: "8px", verticalAlign: "middle", border: `1px solid ${RED}40` }}
          />
        )}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholders[index]}
        autoComplete="off"
        style={{
          width: "100%", background: "rgba(255,255,255,0.04)",
          border: value.tmdbId ? `0.5px solid ${RED}60` : "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: "10px", padding: "13px 16px",
          fontFamily: "'DM Mono', monospace", fontSize: "11px",
          letterSpacing: "0.08em", color: "#E8E4D4", outline: "none",
        }}
      />
      {loading && (
        <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: "rgba(232,228,212,0.3)" }}>
          …
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px", overflow: "hidden", marginTop: "4px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.8)",
        }}>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => pick(r)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "10px 14px", border: "none",
                background: "transparent", cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,74,74,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {r.poster_path
                ? <img src={posterSrc(r.poster_path)} alt={r.title} style={{ width: "28px", height: "42px", objectFit: "cover", borderRadius: "2px", flexShrink: 0 }} />
                : <div style={{ width: "28px", height: "42px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#E8E4D4", letterSpacing: "0.04em" }}>
                  {r.title}
                </div>
                <div style={{ fontSize: "9px", color: "rgba(232,228,212,0.35)", marginTop: "2px" }}>
                  {r.release_date ? r.release_date.slice(0, 4) : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ID CARD — Film Club red chrome, dark archetype bg, TMDB posters
   ══════════════════════════════════════════════════════════════ */
function IDCard({
  archetype, memberNumber, username, topFilms, cardRef,
}: {
  archetype:    Archetype;
  memberNumber: string;
  username:     string;
  topFilms:     FilmPick[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cardRef:      React.RefObject<any>;
}) {
  // Card chrome is always Film Club red
  const ac     = RED;
  const acDim  = "rgba(255,74,74,0.55)";
  const acLine = "rgba(255,74,74,0.28)";
  const acFaint = "rgba(255,74,74,0.10)";

  const hasFilms = topFilms.filter((f) => f.title).length === 3;
  const displayFilms = hasFilms ? topFilms : archetype.films.map((t) => ({ title: t, year: "", posterPath: null, tmdbId: null }));
  const issued = new Date().toLocaleString("en", { month: "short", year: "numeric" }).toUpperCase();

  return (
    <div ref={cardRef} style={{
      width: "360px",
      background: archetype.cardBg,
      borderRadius: "5px",
      padding: "24px 22px 18px",
      position: "relative",
      overflow: "hidden",
      border: `1px solid ${acLine}`,
      boxShadow: `0 0 80px rgba(255,74,74,0.06), 0 32px 90px rgba(0,0,0,0.97), inset 0 1px 0 ${acLine}`,
      fontFamily: "'Courier New', Courier, monospace",
    }}>
      {/* Film grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none", borderRadius: "5px",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "180px 180px",
      }} />
      {/* Top shimmer — red */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent 0%, ${ac} 50%, transparent 100%)`, opacity: 0.7 }} />
      {/* Bottom shimmer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${acLine}, transparent)` }} />
      {/* Corner marks */}
      {(["tl","tr","bl","br"] as const).map((pos) => (
        <div key={pos} style={{
          position: "absolute", width: "9px", height: "9px",
          ...(pos === "tl" && { top: "10px", left: "10px", borderTop: `1px solid ${acLine}`, borderLeft: `1px solid ${acLine}` }),
          ...(pos === "tr" && { top: "10px", right: "10px", borderTop: `1px solid ${acLine}`, borderRight: `1px solid ${acLine}` }),
          ...(pos === "bl" && { bottom: "10px", left: "10px", borderBottom: `1px solid ${acLine}`, borderLeft: `1px solid ${acLine}` }),
          ...(pos === "br" && { bottom: "10px", right: "10px", borderBottom: `1px solid ${acLine}`, borderRight: `1px solid ${acLine}` }),
        }} />
      ))}

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", position: "relative", zIndex: 1 }}>
        <div>
          {/* "est. 2026" label above wordmark — mirrors wallpaper */}
          <div style={{ fontSize: "6px", letterSpacing: "2.5px", color: ac, opacity: 0.7, marginBottom: "3px", fontFamily: "'DM Mono', monospace" }}>
            EST. 2026
          </div>
          {/* Wordmark: cream "FILM CLUB" + red "ID" badge inline */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "7px", lineHeight: 1 }}>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "28px", letterSpacing: "0.06em", color: "#fdf9e3", lineHeight: 1 }}>
              FILM CLUB
            </div>
            <div style={{ background: ac, borderRadius: "2px", padding: "4px 7px", fontSize: "6px", letterSpacing: "2px", color: "#0d0c16", fontFamily: "'DM Mono', monospace", fontWeight: 700, alignSelf: "center", lineHeight: "1" }}>
              ID
            </div>
          </div>
          <div style={{ fontSize: "6px", letterSpacing: "2px", color: "rgba(255,255,255,0.18)", marginTop: "4px", fontFamily: "'DM Mono', monospace" }}>
            IDENTITY PASSPORT · WAVE 01
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", background: acFaint, border: `1px solid ${acLine}`, borderRadius: "2px", padding: "4px 9px", fontSize: "6px", letterSpacing: "2px", color: ac, fontFamily: "'DM Mono', monospace", fontWeight: 700, marginTop: "4px", lineHeight: "1" }}>
          FOUNDING MEMBER
        </div>
      </div>

      {/* ── MEMBER ROW — sits directly under header ── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "14px", position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", color: ac, lineHeight: 1, textShadow: `0 0 28px ${acDim}` }}>
          {memberNumber}
        </div>
        <div style={{ fontSize: "13px", letterSpacing: "5px", color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>
          {(username || "YOUR NAME").toUpperCase()}
        </div>
      </div>

      {/* ── CINEMATIC IDENTITY — below member row ── */}
      <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "6px", letterSpacing: "3px", color: "rgba(255,255,255,0.28)", marginBottom: "8px" }}>CINEMATIC IDENTITY</div>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", background: acFaint, border: `1px solid ${acLine}`, borderRadius: "2px", padding: "4px 9px", fontSize: "6px", letterSpacing: "1.5px", color: ac, fontWeight: 700, marginBottom: "8px", lineHeight: "1" }}>
          ◆ {archetype.id.replace(/-/g, " ").toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: archetype.name.length > 16 ? "26px" : "32px", fontWeight: 700, letterSpacing: "1px", color: "#f0ede8", lineHeight: 1.0, marginBottom: "5px", textShadow: `0 0 40px ${acDim}` }}>
          {archetype.name}
        </div>
        <div style={{ fontSize: "9px", letterSpacing: "0.8px", fontStyle: "italic", color: ac, opacity: 0.8, marginBottom: "10px" }}>
          {archetype.tagline}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontStyle: "italic", fontWeight: 300, lineHeight: 1.6, color: "rgba(232,228,212,0.55)", marginBottom: "10px" }}>
          {archetype.desc}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "5px" }}>
          {archetype.tags.map((tag) => (
            <span key={tag} style={{
              fontSize: "5.5px", letterSpacing: "1.5px", color: ac,
              border: `1px solid ${acLine}`, borderRadius: "2px",
              padding: "4px 8px", textTransform: "uppercase" as const,
              background: acFaint, whiteSpace: "nowrap" as const,
              lineHeight: "1",
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── FILM CLUB TOP 3 ── */}
      <div style={{ borderTop: "1px solid rgba(255,74,74,0.18)", paddingTop: "13px", marginBottom: "14px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "13px", letterSpacing: "3px", color: "#f0ede8", lineHeight: 1 }}>
            FILM CLUB TOP 3
          </div>
          <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${acLine}, transparent)` }} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {displayFilms.map((film, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: "3px", overflow: "hidden", marginBottom: "5px", position: "relative", border: film.posterPath ? "none" : "1px dashed rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {film.posterPath
                  ? <img src={posterSrc(film.posterPath)} alt={film.title} data-poster="1" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "16px" }}>＋</span>
                }
              </div>
              <div style={{ fontSize: "5.5px", letterSpacing: "0.8px", color: "rgba(255,255,255,0.58)", textAlign: "center" as const, textTransform: "uppercase" as const, lineHeight: 1.35 }}>
                {film.title}
              </div>
              {film.year && (
                <div style={{ fontSize: "5px", letterSpacing: "1px", color: ac, opacity: 0.65, textAlign: "center" as const, marginTop: "2px" }}>{film.year}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FILM DNA ── */}
      <div style={{ marginBottom: "14px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "6px", letterSpacing: "3px", color: "rgba(255,255,255,0.28)", marginBottom: "8px" }}>FILM DNA</div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <RadarChart scores={archetype.dna} accent={archetype.radarAc} />
          <div style={{ flex: 1 }}>
            {DNA_AXES.map((axis, i) => (
              <div key={axis} style={{ marginBottom: i < 4 ? "8px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "6.5px", letterSpacing: "0.5px", color: "rgba(255,255,255,0.40)" }}>{axis}</span>
                  <span style={{ fontSize: "7px", fontWeight: 700, color: ac }}>{archetype.dna[i].toFixed(1)}</span>
                </div>
                <div style={{ height: "1.5px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(archetype.dna[i] / 10) * 100}%`, background: ac, opacity: 0.65, borderRadius: "1px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "9px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "6px", letterSpacing: "1.8px", color: "rgba(255,255,255,0.22)" }}>ISSUED {issued}</div>
        <div style={{ fontSize: "6.5px", letterSpacing: "2px", color: ac, opacity: 0.45, fontWeight: 700 }}>JOINFILM.CLUB</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STORY CARD — 9:16 for IG / TikTok Stories
   390 × 693 px  →  rendered at 3× = 1170 × 2079 (≈ 9:16)
   ══════════════════════════════════════════════════════════════ */
function StoryCard({
  archetype, memberNumber, username, topFilms, cardRef,
}: {
  archetype:    Archetype;
  memberNumber: string;
  username:     string;
  topFilms:     FilmPick[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cardRef: React.RefObject<any>;
}) {
  const ac      = RED;
  const acLine  = "rgba(255,74,74,0.28)";
  const acFaint = "rgba(255,74,74,0.10)";
  const hasFilms   = topFilms.filter((f) => f.title).length === 3;
  const displayFilms = hasFilms
    ? topFilms
    : archetype.films.map((t) => ({ title: t, year: "", posterPath: null, tmdbId: null }));

  return (
    <div ref={cardRef} style={{
      width: "390px", height: "693px",
      background: archetype.cardBg,
      fontFamily: "'Courier New', Courier, monospace",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      padding: "28px 26px 24px",
      boxSizing: "border-box",
    }}>
      {/* Grain */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "180px 180px",
      }} />
      {/* Top red shimmer */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.5px", background: `linear-gradient(90deg, transparent 0%, ${ac} 50%, transparent 100%)`, opacity: 0.8 }} />
      {/* Bottom shimmer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${acLine}, transparent)` }} />

      {/* ── HEADER ── */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: "16px", flexShrink: 0 }}>
        <div style={{ fontSize: "7px", letterSpacing: "2.5px", color: ac, opacity: 0.65, marginBottom: "5px", fontFamily: "'DM Mono', monospace" }}>EST. 2026</div>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "30px", letterSpacing: "0.06em", color: "#fdf9e3", lineHeight: 1 }}>
            FILM CLUB
          </div>
          <div style={{ background: ac, borderRadius: "2px", padding: "4px 7px", fontSize: "7px", letterSpacing: "2px", color: "#0d0c16", fontFamily: "'DM Mono', monospace", fontWeight: 700, lineHeight: "1" }}>
            ID
          </div>
        </div>
      </div>

      {/* divider */}
      <div style={{ height: "1px", background: "rgba(255,74,74,0.18)", marginBottom: "20px", position: "relative", zIndex: 1, flexShrink: 0 }} />

      {/* ── ARCHETYPE ── */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>

        {/* Identity block */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: acFaint, border: `1px solid ${acLine}`, borderRadius: "2px", padding: "4px 9px", fontSize: "7px", letterSpacing: "1.5px", color: ac, fontWeight: 700, marginBottom: "10px", lineHeight: "1" }}>
            ◆ {archetype.id.replace(/-/g, " ").toUpperCase()}
          </div>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "52px", letterSpacing: "0.5px", color: "#f0ede8", lineHeight: 0.92, marginBottom: "10px", textShadow: `0 0 40px rgba(255,74,74,0.35)` }}>
            {archetype.name}
          </div>
          <div style={{ fontSize: "12px", letterSpacing: "0.6px", fontStyle: "italic", color: ac, opacity: 0.85, marginBottom: "12px" }}>
            {archetype.tagline}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "18px" }}>
            {archetype.tags.map((tag) => (
              <span key={tag} style={{
                fontSize: "7px", letterSpacing: "1.5px", color: ac,
                border: `1px solid ${acLine}`, borderRadius: "2px",
                padding: "4px 9px", textTransform: "uppercase" as const,
                background: acFaint, whiteSpace: "nowrap" as const, lineHeight: "1",
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Member row */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "12px" }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "12px" }}>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "22px", color: ac, lineHeight: 1, textShadow: `0 0 20px rgba(255,74,74,0.5)` }}>
              {memberNumber}
            </div>
            <div style={{ fontSize: "11px", letterSpacing: "4px", color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
              {(username || "YOUR NAME").toUpperCase()}
            </div>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "16px" }} />
        </div>

        {/* Top 3 Films */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "11px", letterSpacing: "3px", color: "#f0ede8", lineHeight: 1 }}>
              FILM CLUB TOP 3
            </div>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${acLine}, transparent)` }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {displayFilms.map((film, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: "4px", overflow: "hidden", marginBottom: "6px", background: "rgba(255,255,255,0.04)", border: film.posterPath ? "none" : "1px dashed rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {film.posterPath
                    ? <img src={posterSrc(film.posterPath)} alt={film.title} data-story-poster="1" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "20px" }}>＋</span>
                  }
                </div>
                <div style={{ fontSize: "7px", letterSpacing: "0.6px", color: "rgba(255,255,255,0.55)", textAlign: "center" as const, textTransform: "uppercase" as const, lineHeight: 1.3 }}>
                  {film.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", marginTop: "14px", marginBottom: "10px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "7px", letterSpacing: "2px", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>FILM CLUB ID</div>
            <div style={{ fontSize: "8px", letterSpacing: "2px", color: ac, opacity: 0.5, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>JOINFILM.CLUB</div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROGRESS BAR
   ══════════════════════════════════════════════════════════════ */
function ProgressBar({ step }: { step: number }) {
  const pct = Math.min(((step - 1) / 5) * 100, 100);
  return (
    <div style={{ width: "100%", height: "1.5px", background: "rgba(255,255,255,0.08)", borderRadius: "99px", overflow: "hidden" }}>
      <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ height: "100%", background: RED, borderRadius: "99px" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════ */
export default function QuizPage() {
  const { signUp } = useAuth();
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<number[][]>([]);
  const [selected, setSelected]   = useState<number | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [memberNum, setMemberNum] = useState("");
  const [topFilms, setTopFilms]   = useState<FilmPick[]>([emptyPick(), emptyPick(), emptyPick()]);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hasAccount, setHasAccount] = useState(false);
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storyRef = useRef<any>(null);

  const currentQ = step >= 1 && step <= 5 ? QUESTIONS[step - 1] : null;

  function handleAnswer(idx: number) {
    setSelected(idx);
    setTimeout(() => {
      const newAnswers = [...answers, QUESTIONS[step - 1].answers[idx].scores];
      setAnswers(newAnswers);
      setSelected(null);
      if (step < 5) {
        setStep(step + 1);
      } else {
        setArchetype(computeArchetype(newAnswers));
        // Fetch real sequential member number from Supabase profile count
        fetchMemberNumber().then(setMemberNum);
        setStep(6);
      }
    }, 320);
  }

  function updateFilm(i: number, pick: FilmPick) {
    const next = [...topFilms];
    next[i] = pick;
    setTopFilms(next);
  }

  async function handleSignUp() {
    if (!email || !username || !password) { setSaveError("All fields are required."); return; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!emailOk) { setSaveError("Please enter a valid email address."); return; }
    if (password.length < 8) { setSaveError("Password must be at least 8 characters."); return; }
    setSaving(true);
    setSaveError("");
    const { error } = await signUp(email.trim().toLowerCase(), password, username);
    if (error) { setSaveError(error); setSaving(false); return; }
    if (archetype) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          username,
          taste_tribe:   archetype.id,
          member_number: memberNum,
          top_films:     topFilms,
          bio:           `${archetype.name} · ${memberNum}`,
        }).eq("id", user.id);
      }
    }
    setSaving(false);
    setHasAccount(true);
    setStep(9);
  }

  /* Convert a same-origin proxy URL to a data-URL via canvas for html2canvas */
  async function toDataURL(src: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      // No crossOrigin needed — proxy is same-origin
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  async function downloadCard() {
    if (!cardRef.current) return;
    try {
      // Pre-convert all poster imgs to data URLs so html2canvas can capture them
      const imgs = Array.from(
        cardRef.current.querySelectorAll("img[data-poster]")
      ) as HTMLImageElement[];
      const origSrcs: string[] = [];
      for (const img of imgs) {
        origSrcs.push(img.src);
        img.src = await toDataURL(img.src);
      }

      const h2c = await import("html2canvas");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2canvas = (h2c as any).default ?? h2c;
      const canvas = await html2canvas(cardRef.current, {
        scale: 4, useCORS: true, allowTaint: true, backgroundColor: null, logging: false,
      });

      // Restore original srcs
      imgs.forEach((img, i) => { img.src = origSrcs[i]; });

      const link = document.createElement("a");
      link.download = `filmclub-id-${archetype?.id ?? "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) { console.error(e); }
  }

  /* Share card — renders the 9:16 StoryCard for IG/TikTok Stories.
     Native share sheet on mobile, download on desktop. */
  async function shareCard() {
    const target = storyRef.current ?? cardRef.current;
    if (!target) return;
    try {
      // Pre-convert poster images to data-URLs for html2canvas
      const imgs = Array.from(
        target.querySelectorAll("img[data-story-poster], img[data-poster]")
      ) as HTMLImageElement[];
      const origSrcs: string[] = [];
      for (const img of imgs) {
        origSrcs.push(img.src);
        img.src = await toDataURL(img.src);
      }

      const h2c = await import("html2canvas");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2canvas = (h2c as any).default ?? h2c;
      const canvas = await html2canvas(target, {
        scale: 3, useCORS: true, allowTaint: true, backgroundColor: null, logging: false,
      });
      imgs.forEach((img, i) => { img.src = origSrcs[i]; });

      const profileUrl = username
        ? `${window.location.origin}/u/${username}`
        : window.location.origin;

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) { downloadCard(); return; }
        const file = new File([blob], "filmclub-id.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files:  [file],
            title:  `I'm ${archetype?.name ?? "a film person"} · FILM CLUB`,
            text:   `My FILM CLUB identity: ${archetype?.name} · ${memberNum} · ${profileUrl}`,
          });
        } else {
          try { await navigator.clipboard.writeText(profileUrl); } catch { /* ignore */ }
          const link = document.createElement("a");
          link.download = `filmclub-id-${archetype?.id ?? "card"}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
      }, "image/png");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") downloadCard();
    }
  }

  /* ── shared styles ── */
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "10px",
    padding: "13px 16px", fontFamily: "'DM Mono', monospace",
    fontSize: "11px", letterSpacing: "0.08em", color: "#E8E4D4", outline: "none",
  };
  const btnRed: React.CSSProperties = {
    background: RED, color: "#fff", fontFamily: "'DM Mono', monospace",
    fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase",
    padding: "13px 24px", borderRadius: "99px", border: "none", cursor: "pointer", width: "100%",
  };
  const btnGrey: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", color: "rgba(232,228,212,0.55)",
    fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.22em",
    textTransform: "uppercase", padding: "13px 24px", borderRadius: "99px",
    border: "0.5px solid rgba(255,255,255,0.1)", cursor: "pointer", width: "100%",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: BG, fontFamily: "'DM Mono', monospace" }}>
      <div className="w-full max-w-[420px]">

        {step >= 1 && step <= 5 && (
          <div className="mb-8">
            <ProgressBar step={step} />
            <div className="mt-2 flex justify-between">
              <span style={{ fontSize: "7.5px", letterSpacing: "0.22em", color: "rgba(232,228,212,0.25)", textTransform: "uppercase" }}>Question {step} of 5</span>
              <span style={{ fontSize: "7.5px", letterSpacing: "0.22em", color: "rgba(255,74,74,0.5)", textTransform: "uppercase" }}>FILM CLUB</span>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── 0: INTRO ─── */}
          {step === 0 && (
            <motion.div key="intro" variants={fadeV} initial="initial" animate="animate" exit="exit" transition={fadeT} className="flex flex-col items-start">
              <div style={{ fontSize: "9px", letterSpacing: "0.3em", color: RED, textTransform: "uppercase", marginBottom: "24px" }}>FILM CLUB</div>
              <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(52px, 14vw, 68px)", lineHeight: 0.88, letterSpacing: "0.02em", color: "#E8E4D4", textTransform: "uppercase", marginBottom: "24px" }}>
                DISCOVER<br />YOUR<br /><span style={{ color: RED }}>IDENTITY.</span>
              </h1>
              <div style={{ width: "36px", height: "1.5px", background: RED, opacity: 0.6, marginBottom: "22px" }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontStyle: "italic", fontWeight: 300, lineHeight: 1.7, color: "rgba(232,228,212,0.55)", marginBottom: "40px" }}>
                Five questions. One cinematic identity. Your FILM CLUB ID - a credential that says more about you than any watchlist ever could.
              </p>
              <button onClick={() => setStep(1)} style={{ ...btnRed, marginBottom: "16px", fontSize: "10px" }}>
                Begin →
              </button>
              <p style={{ fontSize: "7.5px", letterSpacing: "0.18em", color: "rgba(232,228,212,0.2)", textTransform: "uppercase", textAlign: "center", width: "100%" }}>
                Takes 60 seconds · Wave 01 · Founding member
              </p>
            </motion.div>
          )}

          {/* ── 1-5: QUESTIONS ─── */}
          {currentQ && (
            <motion.div key={`q${step}`} variants={slideV} initial="initial" animate="animate" exit="exit" transition={slideT} className="flex flex-col">
              <p style={{ fontSize: "7.5px", letterSpacing: "0.22em", color: "rgba(232,228,212,0.3)", textTransform: "uppercase", marginBottom: "16px" }}>{currentQ.sub}</p>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(28px, 7.5vw, 36px)", lineHeight: 1.05, letterSpacing: "0.02em", color: "#E8E4D4", textTransform: "uppercase", marginBottom: "32px" }}>
                {currentQ.prompt}
              </h2>
              <div className="flex flex-col gap-3">
                {currentQ.answers.map((answer, idx) => (
                  <motion.button key={idx} onClick={() => selected === null && handleAnswer(idx)} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                    style={{
                      textAlign: "left", padding: "16px 20px", borderRadius: "12px",
                      border: selected === idx ? `1px solid ${RED}60` : "1px solid rgba(255,255,255,0.07)",
                      background: selected === idx ? "rgba(255,74,74,0.1)" : "rgba(255,255,255,0.04)",
                      cursor: selected !== null ? "default" : "pointer", transition: "all 0.15s",
                      fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 300, fontStyle: "italic", lineHeight: 1.5,
                      color: selected === idx ? "#E8E4D4" : "rgba(232,228,212,0.65)",
                    }}>
                    {answer.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 6: TOP 3 FILMS ─── */}
          {step === 6 && (
            <motion.div key="films" variants={slideV} initial="initial" animate="animate" exit="exit" transition={slideT} className="flex flex-col">
              <div style={{ fontSize: "7.5px", letterSpacing: "0.28em", color: "rgba(232,228,212,0.3)", textTransform: "uppercase", marginBottom: "16px" }}>Almost there</div>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 9vw, 44px)", lineHeight: 0.92, color: "#E8E4D4", textTransform: "uppercase", marginBottom: "12px" }}>
                YOUR TOP 3<br /><span style={{ color: RED }}>FILMS.</span>
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontStyle: "italic", fontWeight: 300, color: "rgba(232,228,212,0.45)", lineHeight: 1.65, marginBottom: "32px" }}>
                These go on your ID. The films that made you who you are - not what you think you should say.
              </p>
              <div className="flex flex-col gap-6">
                {[0, 1, 2].map((i) => (
                  <FilmSearchInput key={i} index={i} value={topFilms[i]} onSelect={(pick) => updateFilm(i, pick)} />
                ))}
              </div>
              <button onClick={() => setStep(7)} style={{ ...btnRed, marginTop: "28px" }}>
                Reveal my identity →
              </button>
              <button onClick={() => setStep(7)} style={{ ...btnGrey, marginTop: "10px", fontSize: "8px" }}>
                Skip — use defaults
              </button>
            </motion.div>
          )}

          {/* ── 7: REVEAL ─── */}
          {step === 7 && archetype && (
            <motion.div key="reveal" variants={fadeV} initial="initial" animate="animate" exit="exit" transition={fadeT} className="flex flex-col items-center">
              <div style={{ fontSize: "7.5px", letterSpacing: "0.28em", color: "rgba(232,228,212,0.3)", textTransform: "uppercase", marginBottom: "20px", width: "100%", textAlign: "center" }}>
                Your FILM CLUB Identity
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                style={{ marginBottom: "28px" }}
              >
                <IDCard archetype={archetype} memberNumber={memberNum} username={username || "YOUR NAME"} topFilms={topFilms} cardRef={cardRef} />
              </motion.div>
              <div className="flex flex-col gap-3 w-full">
                {!hasAccount && (
                  <button onClick={() => setStep(8)} style={btnRed}>Save permanently → Create account</button>
                )}
                <button onClick={shareCard} style={hasAccount ? btnRed : btnGrey}>↑ Share your ID</button>
                {hasAccount && (
                  <button onClick={downloadCard} style={btnGrey}>↓ Download</button>
                )}
              </div>
              <p style={{ marginTop: "14px", fontSize: "7.5px", letterSpacing: "0.16em", color: "rgba(232,228,212,0.2)", textTransform: "uppercase", textAlign: "center" }}>
                {hasAccount ? `${memberNum} · identity locked` : "Your number is permanent · identity evolves"}
              </p>
            </motion.div>
          )}

          {/* ── 8: SIGN UP ─── */}
          {step === 8 && archetype && (
            <motion.div key="signup" variants={slideV} initial="initial" animate="animate" exit="exit" transition={slideT} className="flex flex-col">
              <div style={{ fontSize: "7.5px", letterSpacing: "0.28em", color: RED, textTransform: "uppercase", marginBottom: "16px" }}>{archetype.name}</div>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 9vw, 44px)", lineHeight: 0.92, color: "#E8E4D4", textTransform: "uppercase", marginBottom: "24px" }}>
                LOCK IN<br />YOUR ID.
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontStyle: "italic", fontWeight: 300, color: "rgba(232,228,212,0.45)", lineHeight: 1.65, marginBottom: "32px" }}>
                Your archetype and member number are saved. When the app launches, you sign straight in.
              </p>

              {([
                { label: "Username", value: username, setter: setUsername, type: "text",     placeholder: "how you'll appear in FILM CLUB" },
                { label: "Email",    value: email,    setter: setEmail,    type: "email",    placeholder: "we'll send your wave 01 details" },
                { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "min 8 characters" },
              ] as const).map(({ label, value, setter, type, placeholder }) => (
                <div key={label} style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "7.5px", letterSpacing: "0.22em", color: "rgba(232,228,212,0.35)", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
                  <input type={type} value={value}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(e) => (setter as any)(e.target.value)}
                    placeholder={placeholder} style={inputStyle} />
                </div>
              ))}

              {saveError && <p style={{ fontSize: "9px", letterSpacing: "0.14em", color: RED, marginBottom: "16px", lineHeight: 1.5 }}>{saveError}</p>}

              <button onClick={handleSignUp} disabled={saving}
                style={{ ...btnRed, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer", marginTop: "8px" }}>
                {saving ? "Creating your ID…" : "Create account →"}
              </button>
              <button onClick={() => setStep(7)} style={{ background: "transparent", color: "rgba(232,228,212,0.3)", fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", border: "none", cursor: "pointer", marginTop: "14px", padding: "8px" }}>
                ← Back to my ID
              </button>
            </motion.div>
          )}

          {/* ── 9: DONE ─── */}
          {step === 9 && archetype && (
            <motion.div key="done" variants={fadeV} initial="initial" animate="animate" exit="exit" transition={fadeT} className="flex flex-col items-start">
              <div style={{ fontSize: "9px", letterSpacing: "0.28em", color: RED, textTransform: "uppercase", marginBottom: "20px" }}>Wave 01 · {memberNum}</div>
              <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(44px, 12vw, 60px)", lineHeight: 0.88, color: "#E8E4D4", textTransform: "uppercase", marginBottom: "16px" }}>
                WELCOME<br />TO THE<br /><span style={{ color: RED }}>CLUB.</span>
              </h2>
              <div style={{ width: "28px", height: "1.5px", background: RED, opacity: 0.6, marginBottom: "20px" }} />
              <p style={{ fontFamily: "'Anton', sans-serif", fontSize: "14px", letterSpacing: "0.06em", color: archetype.radarAc, textTransform: "uppercase", marginBottom: "8px" }}>{archetype.name}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontStyle: "italic", fontWeight: 300, color: "rgba(232,228,212,0.5)", lineHeight: 1.7, marginBottom: "20px" }}>
                {archetype.desc}
              </p>
              <button onClick={() => setStep(7)} style={{ ...btnGrey, marginBottom: "24px", fontSize: "8px" }}>
                ← View your ID
              </button>
              <button onClick={shareCard} style={{ ...btnRed, marginBottom: "12px" }}>↑ Share your ID</button>
              <button onClick={downloadCard} style={{ ...btnGrey, marginBottom: "12px" }}>↓ Download</button>
              {username && (
                <p style={{ fontSize: "7.5px", letterSpacing: "0.16em", color: "rgba(232,228,212,0.25)", textTransform: "uppercase", textAlign: "center", width: "100%" }}>
                  filmclub.com/u/{username}
                </p>
              )}
              <p style={{ fontSize: "7.5px", letterSpacing: "0.16em", color: "rgba(232,228,212,0.18)", textTransform: "uppercase", textAlign: "center", width: "100%", marginTop: "6px" }}>
                Tag @filmclub - we share the best ones
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Off-screen 9:16 story card — used only by shareCard() */}
      {archetype && (
        <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none", zIndex: -1 }}>
          <StoryCard
            archetype={archetype}
            memberNumber={memberNum}
            username={username || ""}
            topFilms={topFilms}
            cardRef={storyRef}
          />
        </div>
      )}
    </div>
  );
}
