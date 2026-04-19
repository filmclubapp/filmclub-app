"use client";

/* ============================================================
   ONBOARDING — Activation-first flow
   0: Welcome — "Film is better with people"
   1: Film swipe + rate (the hook — invest before signup)
   2: Card reveal — "This is your taste"
   3: Behaviour — identity, not classification
   4: Pick clubs — show aliveness signals
   5: Create account — earned friction
   6: JOIN THE CLUB → save & redirect into a populated feed
   ============================================================ */

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  posterURL,
  type TMDBFilm,
} from "@/app/lib/tmdb";

/* ---- Curated seed films ---- */
const SEED_FILMS: TMDBFilm[] = [
  {
    id: 157336,
    title: "Interstellar",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIE.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    release_date: "2014-11-05",
    overview: "A team of explorers travel through a wormhole in space.",
    genre_ids: [18, 878],
    vote_average: 8.4,
  },
  {
    id: 106646,
    title: "The Wolf of Wall Street",
    poster_path: "/34m2tygAYBGqA9MXKhRDtzYd4JM.jpg",
    backdrop_path: "/pKIX8MnMUNwnSE36RikWbAa5bfp.jpg",
    release_date: "2013-12-25",
    overview: "Based on the true story of Jordan Belfort.",
    genre_ids: [18, 35],
    vote_average: 8.0,
  },
  {
    id: 10693,
    title: "How to Lose a Guy in 10 Days",
    poster_path: "/7xyZkOmBX9JrcJYt8dGMnlHY5xF.jpg",
    backdrop_path: null,
    release_date: "2003-02-07",
    overview: "A magazine writer bets she can make a man fall in love and then dump her.",
    genre_ids: [35, 10749],
    vote_average: 6.4,
  },
  {
    id: 866398,
    title: "The Brutalist",
    poster_path: "/czIHd9VV9AXb1dVGMjBqJqWoGOf.jpg",
    backdrop_path: null,
    release_date: "2024-12-20",
    overview: "An uncompromising vision of ambition and identity in post-war America.",
    genre_ids: [18],
    vote_average: 7.6,
  },
  {
    id: 1087822,
    title: "Project Hail Mary",
    poster_path: "/pHkKbIroCBFvXotzL3ynzOmqbBP.jpg",
    backdrop_path: null,
    release_date: "2025-03-20",
    overview: "An astronaut wakes up alone on a spaceship millions of miles from home.",
    genre_ids: [878, 18],
    vote_average: 0,
  },
];
import { useAuth } from "@/app/lib/auth-context";
import { supabase } from "@/app/lib/supabase";
import { ensureMvpClubs } from "@/app/lib/hooks";

/* ---- constants ---- */
type Step = 0 | 1 | 2 | 3 | 4 | 5;

const DARK = "#1E1D2B";
const SURFACE = "#2A293A";
const TAGLINE = "#E8E4D4";

const AVATAR_PALETTE = [
  "#4A1C2C", "#1E2D24", "#2D1F33", "#3D2914", "#1A2535",
  "#2B1E1E", "#1F2D2A", "#342018", "#2A1828", "#1E2A22",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function avatarColor(s: string): string {
  if (!s.trim()) return AVATAR_PALETTE[0];
  return AVATAR_PALETTE[hashString(s) % AVATAR_PALETTE.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---- Identity-framed behaviour options ---- */
const BEHAVIOURS = [
  { id: "cinephile", label: "I LIVE IN CINEMAS", sub: "5+ films a week. Obsessed.", emoji: "🎥" },
  { id: "film_buff", label: "I'M ALWAYS WATCHING SOMETHING", sub: "2-3 films a week. Devoted.", emoji: "🍿" },
  { id: "casual", label: "I WATCH WHAT CATCHES ME", sub: "When the mood hits.", emoji: "📺" },
] as const;

/* ---- Clubs (with seeded aliveness signals) ---- */
const GENRE_CLUBS = [
  { name: "A24 Lovers", emoji: "🎭", tag: "INDIE / ARTHOUSE", active: "12 posted today" },
  { name: "Rom-Com Obsessed", emoji: "💕", tag: "ROM-COM", active: "8 posted today" },
  { name: "Nolan Heads", emoji: "🧠", tag: "SCI-FI / THRILLER", active: "15 posted today" },
  { name: "90s Cinema", emoji: "📼", tag: "NOSTALGIA", active: "6 posted today" },
  { name: "International Films", emoji: "🌍", tag: "WORLD CINEMA", active: "9 posted today" },
] as const;

/* ---- helpers ---- */
function GrainOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.045]" aria-hidden>
      <svg className="h-full w-full">
        <filter id="onboarding-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" />
        </filter>
        <rect width="100%" height="100%" filter="url(#onboarding-grain)" />
      </svg>
    </div>
  );
}

function useEnterTransition(active: boolean) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) { setShow(false); return; }
    setShow(false);
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setShow(true));
    });
    return () => { cancelAnimationFrame(outerId); if (innerId) cancelAnimationFrame(innerId); };
  }, [active]);
  return show;
}

function ScreenFrame({ active, children, className = "" }: { active: boolean; children: ReactNode; className?: string }) {
  const show = useEnterTransition(active);
  if (!active) return null;
  return (
    <div className={`min-h-[100dvh] w-full transition-all duration-[400ms] ease-out ${show ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? "w-6 bg-fc-red" : i < current ? "w-1.5 bg-fc-red/50" : "w-1.5 bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function OnboardingPage() {
  const router = useRouter();
  const { signUp, user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>(0);

  /* Account fields (collected at step 5) */
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [saveError, setSaveError] = useState("");

  /* Behaviour */
  const [behaviour, setBehaviour] = useState<string>("");

  /* Clubs */
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set());

  /* Film rating (step 1) — uses curated SEED_FILMS, no API needed */
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [ratedFilms, setRatedFilms] = useState<{ film: TMDBFilm; rating: number }[]>([]);
  const [currentRating, setCurrentRating] = useState<number | "not_seen">(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const currentSwipeFilm = SEED_FILMS[swipeIndex] ?? null;
  const swipeDone = swipeIndex >= SEED_FILMS.length;

  const handleSwipe = useCallback((direction: "left" | "right") => {
    if (!currentSwipeFilm) return;
    setSwipeDirection(direction);
    setTimeout(() => {
      if (direction === "right" && currentRating !== 0 && currentRating !== "not_seen") {
        setRatedFilms((prev) => [...prev, { film: currentSwipeFilm, rating: currentRating as number }]);
      }
      setSwipeIndex((i) => i + 1);
      setCurrentRating(0);
      setSwipeDirection(null);
    }, 300);
  }, [currentSwipeFilm, currentRating]);

  /* Final create-account + save */
  const handleJoinTheClub = useCallback(async () => {
    setSignupError("");
    setSaveError("");
    if (!displayName.trim()) { setSignupError("Enter your name."); return; }
    if (!email.trim()) { setSignupError("Enter your email."); return; }
    if (password.length < 6) { setSignupError("Password needs at least 6 characters."); return; }

    setSigningUp(true);
    const username = displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
    const { error: authError } = await signUp(email, password, username);

    if (authError) { setSignupError(authError); setSigningUp(false); return; }

    // Wait briefly for auth state to settle then save profile
    await new Promise((r) => setTimeout(r, 200));

    // Re-fetch session to get the new user id
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || user?.id;

    if (!uid) {
      setSaveError("Account created — please sign in to continue.");
      setSigningUp(false);
      return;
    }

    try {
      const topThreeIds = ratedFilms.slice(0, 3).map((r) => r.film.id);
      const favFilm = topThreeIds.length > 0 ? topThreeIds[0] : null;

      // Wait for profile row to exist (created by trigger or auth handler)
      let profileExists = false;
      for (let i = 0; i < 5; i++) {
        const { data: p } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
        if (p) { profileExists = true; break; }
        await new Promise((r) => setTimeout(r, 200));
      }

      const profileData = {
        display_name: displayName.trim(),
        favourite_film_tmdb_id: favFilm,
        top_three_tmdb_ids: topThreeIds,
      };

      if (profileExists) {
        await supabase.from("profiles").update(profileData).eq("id", uid);
      } else {
        await supabase.from("profiles").insert({ id: uid, username, ...profileData });
      }

      // Ensure clubs exist + join selected
      await ensureMvpClubs(uid);
      if (selectedClubs.size > 0) {
        const { data: allClubs } = await supabase
          .from("clubs")
          .select("id, name")
          .in("name", [...selectedClubs]);
        if (allClubs) {
          for (const club of allClubs) {
            await supabase.from("club_memberships").upsert(
              { club_id: club.id, user_id: uid, role: "member" },
              { onConflict: "club_id,user_id" }
            );
          }
        }
      }

      // Log the rated films so they appear in feed (instant social proof)
      if (ratedFilms.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const logRows = ratedFilms.map((r) => ({
          user_id: uid,
          tmdb_id: r.film.id,
          title: r.film.title,
          poster_path: r.film.poster_path,
          backdrop_path: r.film.backdrop_path,
          rating: r.rating,
          review_text: null,
          is_rewatch: false,
          has_spoilers: false,
          watched_date: today,
          genre_ids: r.film.genre_ids ?? [],
          release_year: r.film.release_date ? parseInt(r.film.release_date.slice(0, 4)) : null,
        }));
        await supabase.from("film_logs").insert(logRows);
      }

      await refreshProfile();
      setSigningUp(false);

      // Drop into the most populated club they joined for instant aliveness
      // Or fall back to home
      router.push("/home");
    } catch {
      setSaveError("Almost there — refreshing.");
      setSigningUp(false);
    }
  }, [displayName, email, password, signUp, user, refreshProfile, router, ratedFilms, selectedClubs]);

  const toggleClub = (name: string) => {
    setSelectedClubs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const avatarBg = avatarColor(displayName || "guest");
  const avatarIni = initials(displayName) || "·";

  return (
    <div className="relative z-[10000] min-h-[100dvh] overflow-x-hidden" style={{ backgroundColor: DARK }}>
      <GrainOverlay />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col">

        {/* ============ STEP 0 — Welcome ============ */}
        {step === 0 && (
          <div className="fc-onboarding-splash flex min-h-[100dvh] flex-col px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="mb-6 font-mono text-[9px] uppercase tracking-[0.28em] text-fc-red/70">
                — est. 2026 —
              </p>
              <h1 className="font-anton text-[clamp(4.5rem,19vw,5.5rem)] leading-[0.95] tracking-wide text-white">
                FILM CLUB
              </h1>
              <div className="my-5 h-px w-9 bg-fc-red" aria-hidden />
              <p className="max-w-[300px] font-anton text-[26px] leading-[1.05] tracking-wide text-white">
                FILM IS BETTER<br />WITH PEOPLE.
              </p>
              <p className="mt-4 max-w-[260px] font-sans text-base font-light italic leading-relaxed" style={{ color: TAGLINE }}>
                You&apos;re about to find yours.
              </p>
            </div>
            <div className="flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full max-w-xs rounded-full bg-fc-red px-10 py-3.5 font-anton text-sm tracking-[0.1em] text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                GET YOUR CARD
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 1 — Film Swipe (the hook) ============ */}
        <ScreenFrame active={step === 1} className="flex flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-6">
            <ProgressDots current={0} total={5} />
          </div>

          <header className="pb-3">
            <h2 className="font-anton text-[30px] leading-none tracking-wide text-white">
              RATE A FEW{" "}
              <span className="text-fc-red">FILMS</span>
            </h2>
            <p className="mt-2 font-sans text-sm font-light italic text-white/50">
              swipe right if you love it. left to skip. this builds your card.
            </p>
          </header>

          {!swipeDone && currentSwipeFilm && (
            <div className="flex flex-1 flex-col items-center">
              <div
                className={`relative w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 ${
                  swipeDirection === "left"
                    ? "-translate-x-[120%] rotate-[-12deg] opacity-0"
                    : swipeDirection === "right"
                    ? "translate-x-[120%] rotate-[12deg] opacity-0"
                    : ""
                }`}
              >
                <div className="relative aspect-[2/3] w-full">
                  <Image
                    src={posterURL(currentSwipeFilm.poster_path, "w500")}
                    alt={currentSwipeFilm.title}
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-anton text-[22px] leading-tight tracking-wide text-white">
                      {currentSwipeFilm.title.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-white/50">
                      {currentSwipeFilm.release_date?.slice(0, 4) || ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full max-w-[280px]">
                {/* Not seen yet toggle */}
                <button
                  type="button"
                  onClick={() => setCurrentRating(currentRating === "not_seen" ? 0 : "not_seen")}
                  className={`mb-3 w-full rounded-xl border py-2 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
                    currentRating === "not_seen"
                      ? "border-white/30 bg-white/10 text-white/80"
                      : "border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/50"
                  }`}
                >
                  {currentRating === "not_seen" ? "✓ NOT SEEN YET" : "NOT SEEN YET"}
                </button>

                {currentRating !== "not_seen" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] tracking-[0.12em] text-white/40">RATING</span>
                      <span className="font-anton text-[24px] text-fc-red">
                        {(currentRating as number) > 0 ? (currentRating as number).toFixed(1) : "—"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.1"
                      value={(currentRating as number) > 0 ? currentRating : 5}
                      onChange={(e) => setCurrentRating(parseFloat(e.target.value))}
                      className="mt-2 w-full accent-[#FF4A4A]"
                    />
                    <div className="mt-1 flex justify-between font-mono text-[7px] text-white/25">
                      <span>1</span>
                      <span>5.5</span>
                      <span>10</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => handleSwipe("left")}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/20 text-white/50 transition hover:border-white/40 hover:text-white/80 active:scale-90"
                  aria-label="Skip"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={currentRating === 0}
                  onClick={() => handleSwipe("right")}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-fc-red text-white shadow-[0_4px_20px_rgba(255,74,74,0.4)] transition enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-30"
                  aria-label="Rate this film"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>

              <p className="mt-4 font-mono text-[9px] text-white/30">
                {swipeIndex + 1} / {SEED_FILMS.length}
              </p>
            </div>
          )}

          {/* SEED_FILMS is static so this never shows, kept as safety fallback */}
          {!swipeDone && !currentSwipeFilm && (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-xs tracking-widest text-white/40">loading films…</p>
            </div>
          )}

          {swipeDone && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-anton text-[28px] tracking-wide text-white">NICE TASTE.</p>
              <p className="mt-2 font-sans text-sm font-light italic text-white/50">
                {ratedFilms.length > 0
                  ? `${ratedFilms.length} film${ratedFilms.length === 1 ? "" : "s"} on your card.`
                  : "No ratings? That's okay — you can build it later."}
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-8 w-full max-w-xs rounded-full bg-fc-red py-3.5 font-anton text-sm tracking-[0.1em] text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                SEE YOUR CARD
              </button>
            </div>
          )}
        </ScreenFrame>

        {/* ============ STEP 2 — Card Reveal ============ */}
        <ScreenFrame active={step === 2} className="flex flex-col items-center justify-center px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="mb-6">
            <ProgressDots current={1} total={5} />
          </div>

          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-fc-red/80">YOUR TASTE</p>
          <h2 className="mt-2 font-anton text-[clamp(2.2rem,9vw,3rem)] leading-none tracking-wide text-white text-center">
            THIS IS YOU.
          </h2>
          <p className="mt-3 font-sans text-sm font-light italic text-white/50 text-center max-w-[260px]">
            Now claim it. Build a place where people argue about films you actually care about.
          </p>

          {/* Mini card preview (with placeholder name until they create account) */}
          <div className="relative mt-6 w-full max-w-[300px] overflow-hidden rounded-2xl border border-white/10" style={{ background: "linear-gradient(160deg, #1a1929 0%, #2a1828 50%, #1e2d24 100%)" }}>
            <div className="p-6">
              <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-fc-red/80">FILM CLUB ID</p>

              {ratedFilms.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[7px] uppercase tracking-[0.18em] text-white/30">YOUR FILMS</p>
                  <div className="flex gap-2">
                    {ratedFilms.slice(0, 3).map((r) => (
                      <div key={r.film.id} className="flex-1">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
                          <Image
                            src={posterURL(r.film.poster_path, "w185")}
                            alt={r.film.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                        <p className="mt-1 text-center font-anton text-[14px] text-fc-red">{r.rating.toFixed(1)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 font-sans text-xs italic text-white/40 text-center">
                  Add films later to fill your card.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="mt-10 w-full max-w-xs rounded-full bg-fc-red py-3.5 font-anton text-sm tracking-[0.1em] text-white transition hover:scale-[1.02]"
          >
            CONTINUE
          </button>
        </ScreenFrame>

        {/* ============ STEP 3 — Behaviour (identity framing) ============ */}
        <ScreenFrame active={step === 3} className="flex flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-6">
            <ProgressDots current={2} total={5} />
          </div>

          <header className="pb-6">
            <h2 className="font-anton text-[30px] leading-[0.95] tracking-wide text-white">
              WHO ARE YOU,<br />
              <span className="text-fc-red">REALLY?</span>
            </h2>
            <p className="mt-2 font-sans text-sm font-light italic text-white/50">
              there&apos;s no wrong answer.
            </p>
          </header>

          <div className="flex flex-1 flex-col gap-3">
            {BEHAVIOURS.map((b) => {
              const active = behaviour === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBehaviour(b.id)}
                  className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition duration-300 ${
                    active
                      ? "border-fc-red bg-fc-red/10 ring-1 ring-fc-red/40"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-anton text-[16px] tracking-wide leading-tight ${active ? "text-fc-red" : "text-white/90"}`}>
                      {b.label}
                    </p>
                    <p className="mt-1 font-sans text-[12px] font-light italic text-white/45">
                      {b.sub}
                    </p>
                  </div>
                  {active && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fc-red">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-6 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={!behaviour}
              onClick={() => setStep(4)}
              className="w-full rounded-full bg-fc-red py-3.5 font-anton text-sm tracking-[0.1em] text-white transition disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:scale-[1.02]"
            >
              CONTINUE
            </button>
          </div>
        </ScreenFrame>

        {/* ============ STEP 4 — Pick Clubs (with aliveness signals) ============ */}
        <ScreenFrame active={step === 4} className="flex flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-6">
            <ProgressDots current={3} total={5} />
          </div>

          <header className="pb-6">
            <h2 className="font-anton text-[30px] leading-[0.95] tracking-wide text-white">
              FIND YOUR{" "}
              <span className="text-fc-red">PEOPLE</span>
            </h2>
            <p className="mt-2 font-sans text-sm font-light italic text-white/50">
              join the clubs where things are happening.
            </p>
          </header>

          <div className="flex flex-1 flex-col gap-3">
            {GENRE_CLUBS.map((club) => {
              const active = selectedClubs.has(club.name);
              return (
                <button
                  key={club.name}
                  type="button"
                  onClick={() => toggleClub(club.name)}
                  className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition duration-300 ${
                    active
                      ? "border-fc-red bg-fc-red/10 ring-1 ring-fc-red/40"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <span className="text-2xl">{club.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-anton text-[15px] tracking-wide ${active ? "text-fc-red" : "text-white/90"}`}>
                      {club.name.toUpperCase()}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="font-mono text-[8px] tracking-[0.12em] text-white/35">
                        {club.tag}
                      </p>
                      <span className="h-1 w-1 rounded-full bg-fc-red animate-pulse" />
                      <p className="font-mono text-[8px] tracking-[0.08em] text-fc-red/70">
                        {club.active}
                      </p>
                    </div>
                  </div>
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition duration-300 ${
                    active ? "border-fc-red bg-fc-red" : "border-white/20 bg-transparent"
                  }`}>
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center font-mono text-[9px] text-white/30">
            {selectedClubs.size} selected — you can join more later
          </p>

          <div className="mt-auto pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={selectedClubs.size === 0}
              onClick={() => setStep(5)}
              className="w-full rounded-full bg-fc-red py-3.5 font-anton text-sm tracking-[0.1em] text-white transition disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:scale-[1.02]"
            >
              CONTINUE
            </button>
          </div>
        </ScreenFrame>

        {/* ============ STEP 5 — Create Account + JOIN THE CLUB ============ */}
        <ScreenFrame active={step === 5} className="flex flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-6">
            <ProgressDots current={4} total={5} />
          </div>

          <header className="pb-4">
            <h2 className="font-anton text-[30px] leading-[0.95] tracking-wide text-white">
              CLAIM YOUR{" "}
              <span className="text-fc-red">CARD</span>
            </h2>
            <p className="mt-2 font-sans text-sm font-light italic text-white/50">
              save your taste. join the club.
            </p>
          </header>

          <div className="mb-5 flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full font-anton text-xl text-white shadow-lg ring-2 ring-white/10 transition-colors duration-500"
              style={{ backgroundColor: avatarBg }}
            >
              {avatarIni}
            </div>
          </div>

          <input
            id="ob-name"
            autoComplete="name"
            placeholder="your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mb-3 w-full rounded-xl px-4 py-3.5 font-mono text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-fc-red/50"
            style={{ backgroundColor: SURFACE }}
          />
          <input
            id="ob-email"
            type="email"
            autoComplete="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-xl px-4 py-3.5 font-mono text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-fc-red/50"
            style={{ backgroundColor: SURFACE }}
          />
          <input
            id="ob-password"
            type="password"
            autoComplete="new-password"
            placeholder="password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-xl px-4 py-3.5 font-mono text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-fc-red/50"
            style={{ backgroundColor: SURFACE }}
          />

          {(signupError || saveError) && (
            <p className="mb-3 text-center font-mono text-xs text-fc-red">{signupError || saveError}</p>
          )}

          <div className="mt-auto flex flex-col gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={signingUp}
              onClick={handleJoinTheClub}
              className="w-full rounded-full bg-fc-red py-4 font-anton text-base tracking-[0.12em] text-white shadow-[0_4px_20px_rgba(255,74,74,0.35)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {signingUp ? "JOINING..." : "JOIN THE CLUB"}
            </button>
            <p className="text-center font-mono text-[9px] text-white/30">
              Already have an account?{" "}
              <button type="button" onClick={() => router.push("/auth")} className="text-fc-red underline">
                Sign in
              </button>
            </p>
          </div>
        </ScreenFrame>
      </div>
    </div>
  );
}
