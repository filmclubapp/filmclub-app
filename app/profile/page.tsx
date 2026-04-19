"use client";

/* ============================================================
   FILM CLUB — PROFILE
   "Your taste, visualised."
   Stats, Film Club ID, top 3, recent logs, clubs.
   ============================================================ */

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { useUserLogs, useMyClubs, useWatchlist, computeTasteProfile, computeStreak } from "../lib/hooks";
import { getFilmDetails, posterURL, type TMDBFilmDetails } from "../lib/tmdb";
import NotificationBell from "../components/NotificationBell";
import NotificationsToggle from "../components/NotificationsToggle";

/* ---------- palette ---------- */
const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const MUTED = "#8B88A6";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/* ============================================================
   QR CODE — lightweight generator
   ============================================================ */
function generateQRMatrix(input: string, size: number = 21): boolean[][] {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const drawFinder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++)
      for (let dc = 0; dc < 7; dc++) {
        const edge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        matrix[r + dr][c + dc] = edge || inner;
      }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  let seed = Math.abs(hash);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) continue;
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      matrix[r][c] = (seed >> 16) % 3 === 0;
    }
  return matrix;
}

function QRCode({ data, size = 120, fg = "#F4EFD8", bg = "transparent" }: { data: string; size?: number; fg?: string; bg?: string }) {
  const matrix = useMemo(() => generateQRMatrix(data), [data]);
  const cellSize = size / matrix.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill={bg} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.5}
              height={cellSize + 0.5}
              fill={fg}
            />
          ) : null
        )
      )}
    </svg>
  );
}

/* ============================================================
   FILM CLUB ID CARD (renamed from Passport)
   ============================================================ */
function FilmClubIDCard({
  userId,
  username,
  displayName,
  memberSince,
  totalLogged,
}: {
  userId: string;
  username: string;
  displayName: string;
  memberSince: string;
  totalLogged: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const shortId = userId.slice(0, 8).toUpperCase();
  const sinceDate = new Date(memberSince).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mb-6" style={{ perspective: "800px" }}>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
        aria-label={flipped ? "Show front of ID" : "Show QR code"}
      >
        {/* FRONT */}
        <div
          className="w-full rounded-2xl border border-white/[0.08] p-5"
          style={{
            backfaceVisibility: "hidden",
            background: "linear-gradient(145deg, #1A0A12 0%, #1E1D2B 40%, #141425 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-fc-red/70">
                FILM CLUB ID
              </p>
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#F4EFD8]/30 mt-0.5">
                FC-{shortId}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fc-red/15 ring-1 ring-fc-red/30">
              <span className="font-anton text-[10px] text-fc-red">FC</span>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-anton text-[20px] leading-[1] tracking-[0.04em] text-[#F4EFD8]">
                {displayName}
              </h3>
              <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-[#F4EFD8]/40">
                @{username}
              </p>
              <div className="mt-3 flex gap-4">
                <div>
                  <p className="font-mono text-[6px] uppercase tracking-[0.2em] text-[#F4EFD8]/30">MEMBER SINCE</p>
                  <p className="font-mono text-[10px] text-[#F4EFD8]/70">{sinceDate}</p>
                </div>
                <div>
                  <p className="font-mono text-[6px] uppercase tracking-[0.2em] text-[#F4EFD8]/30">FILMS LOGGED</p>
                  <p className="font-mono text-[10px] text-[#F4EFD8]/70">{totalLogged}</p>
                </div>
              </div>
            </div>
            <div className="opacity-60">
              <QRCode data={userId} size={56} />
            </div>
          </div>

          <div className="mt-4 h-px w-full bg-gradient-to-r from-fc-red/40 via-fc-red/20 to-transparent" />
          <p className="mt-2 text-center font-mono text-[6px] uppercase tracking-[0.3em] text-[#F4EFD8]/20">
            TAP TO FLIP · SCAN AT EVENTS
          </p>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 w-full rounded-2xl border border-white/[0.08] p-5 flex flex-col items-center justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(145deg, #1E1D2B 0%, #0E0D18 60%, #1A0A12 100%)",
          }}
        >
          <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-fc-red/70 mb-4">
            FOLLOW FILM CLUB
          </p>
          <QRCode data="https://instagram.com/filmclub" size={140} />
          <p className="mt-4 font-mono text-[9px] tracking-[0.16em] text-[#F4EFD8]/50">
            @filmclub
          </p>
          <p className="mt-1 font-mono text-[6px] uppercase tracking-[0.2em] text-[#F4EFD8]/20">
            FOLLOW ON INSTAGRAM
          </p>
        </div>
      </button>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const { logs, loading: logsLoading } = useUserLogs(user?.id);
  const { clubs } = useMyClubs(user?.id);
  const { items: watchlistItems } = useWatchlist(user?.id);
  const taste = computeTasteProfile(logs);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  if (loading || !user)
    return <div style={{ backgroundColor: BG, minHeight: "100vh" }} />;

  const displayName = profile?.display_name || profile?.username || "cinephile";
  const username = profile?.username || "user";
  const initial = displayName.charAt(0).toUpperCase();

  // Fetch top 3 film details from TMDB
  const topThreeIds = profile?.top_three_tmdb_ids ?? [];
  const [topThreeFilms, setTopThreeFilms] = useState<TMDBFilmDetails[]>([]);
  useEffect(() => {
    if (topThreeIds.length === 0) { setTopThreeFilms([]); return; }
    Promise.all(topThreeIds.map((id) => getFilmDetails(id).catch(() => null)))
      .then((results) => setTopThreeFilms(results.filter(Boolean) as TMDBFilmDetails[]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topThreeIds.join(",")]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  // Compute streak from actual log data
  const streak = computeStreak(logs, profile?.created_at);
  // MVP follower/following placeholders
  const followers = 0;
  const following = 0;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: BG, color: INK }}>
      {/* grain */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,74,74,0.08), transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto min-h-screen max-w-[480px]">
        {/* HEADER */}
        <header
          className="sticky top-0 z-30 border-b border-white/[0.05] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl"
          style={{ backgroundColor: `${BG}E6` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[8px] uppercase tracking-[0.32em] text-[#F4EFD8]/40">
                FILM CLUB
              </span>
              <h1 className="font-anton text-[24px] leading-[1] tracking-[0.04em] text-[#F4EFD8]">
                PROFILE
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#F4EFD8]/60 transition hover:text-fc-red hover:border-fc-red/40"
              >
                SIGN OUT
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-32 pt-6">
          <NotificationsToggle />

          {/* PROFILE CARD with followers/following/streak */}
          <section className="mb-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full font-anton text-[28px]"
                style={{ background: `linear-gradient(135deg, ${RED}, #9C7BFF)`, color: BG }}
              >
                {initial}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-anton text-[22px] leading-[1] tracking-[0.02em] text-[#F4EFD8]">
                    {displayName}
                  </h2>
                  {/* Streak badge */}
                  <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 px-2 py-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C8 8 4 12 4 16C4 20 8 22 12 22C16 22 20 20 20 16C20 12 16 8 12 2Z" fill="#FF6B35" />
                      <path d="M12 8C10 12 8 14 8 16C8 18.2 9.8 20 12 20C14.2 20 16 18.2 16 16C16 14 14 12 12 8Z" fill="#FFD86F" />
                    </svg>
                    <span className="font-anton text-[10px] text-orange-300">{streak}</span>
                  </div>
                </div>
                <p className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-[#F4EFD8]/45">
                  @{username}
                </p>
                {/* Followers / Following */}
                <div className="mt-2 flex gap-4">
                  <button type="button" className="group">
                    <span className="font-anton text-[14px] text-[#F4EFD8] group-hover:text-fc-red transition">{followers}</span>
                    <span className="ml-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">Followers</span>
                  </button>
                  <button type="button" className="group">
                    <span className="font-anton text-[14px] text-[#F4EFD8] group-hover:text-fc-red transition">{following}</span>
                    <span className="ml-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">Following</span>
                  </button>
                </div>
              </div>
            </div>
            {profile?.bio && (
              <p className="mt-3 font-dm text-[12px] leading-[1.4] text-[#F4EFD8]/55">
                {profile.bio}
              </p>
            )}
          </section>

          {/* FILM CLUB ID */}
          <FilmClubIDCard
            userId={user.id}
            username={username}
            displayName={displayName}
            memberSince={profile?.created_at || new Date().toISOString()}
            totalLogged={taste.totalLogged}
          />

          {/* STATS ROW — Logged, Watchlist, Clubs are clickable */}
          <section className="mb-6 grid grid-cols-4 gap-2">
            <Link href="/profile/logged" className="group">
              <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.025] py-3 transition group-hover:border-fc-red/30 group-hover:bg-white/[0.04]">
                <span className="font-anton text-[20px] leading-[1] text-[#F4EFD8] group-hover:text-fc-red transition">{taste.totalLogged}</span>
                <span className="mt-1 font-mono text-[6px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">LOGGED</span>
              </div>
            </Link>
            <Link href="/watchlist" className="group">
              <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.025] py-3 transition group-hover:border-fc-red/30 group-hover:bg-white/[0.04]">
                <span className="font-anton text-[20px] leading-[1] text-[#F4EFD8] group-hover:text-fc-red transition">{watchlistItems.length}</span>
                <span className="mt-1 font-mono text-[6px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">WATCHLIST</span>
              </div>
            </Link>
            <StatCard label="AVG" value={taste.avgRating > 0 ? taste.avgRating.toFixed(1) : "—"} />
            <Link href="/profile/clubs" className="group">
              <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.025] py-3 transition group-hover:border-fc-red/30 group-hover:bg-white/[0.04]">
                <span className="font-anton text-[20px] leading-[1] text-[#F4EFD8] group-hover:text-fc-red transition">{clubs.length}</span>
                <span className="mt-1 font-mono text-[6px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">CLUBS</span>
              </div>
            </Link>
          </section>

          {/* TOP 3 FILMS */}
          {topThreeFilms.length > 0 && (
            <section className="mb-6">
              <SectionLabel>YOUR TOP 3</SectionLabel>
              <div className="grid grid-cols-3 gap-2.5">
                {topThreeFilms.map((film, idx) => (
                  <div key={film.id} className="relative flex flex-col items-center">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl ring-2 ring-white/[0.08]">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: film.poster_path
                            ? `url(${posterURL(film.poster_path, "w342")})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: SURFACE,
                        }}
                      />
                      {/* rank badge */}
                      <div
                        className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full font-anton text-[11px]"
                        style={{ backgroundColor: RED, color: "#fff" }}
                      >
                        {idx + 1}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-center font-sans text-[10px] font-medium leading-tight text-[#F4EFD8]/80">
                      {film.title}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TASTE PROFILE */}
          {taste.totalLogged > 0 ? (
            <>
              {/* TOP GENRES */}
              {taste.topGenres.length > 0 && (
                <section className="mb-6">
                  <SectionLabel>TOP GENRES</SectionLabel>
                  <div className="space-y-2">
                    {taste.topGenres.map((g) => {
                      const maxCount = taste.topGenres[0]?.count || 1;
                      const pct = (g.count / maxCount) * 100;
                      return (
                        <div key={g.id} className="flex items-center gap-3">
                          <span className="w-[80px] shrink-0 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-[#F4EFD8]/60">
                            {g.name}
                          </span>
                          <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: `${INK}0A` }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, ${RED}44, ${RED}cc)`,
                              }}
                            />
                          </div>
                          <span className="w-[24px] shrink-0 font-mono text-[10px] text-[#F4EFD8]/50">
                            {g.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* DECADES */}
              {taste.decades.length > 0 && (
                <section className="mb-6">
                  <SectionLabel>DECADES</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {taste.decades.map((d) => (
                      <span
                        key={d.decade}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-anton text-[10px] tracking-[0.12em] text-[#F4EFD8]/70"
                      >
                        {d.decade}{" "}
                        <span className="text-[#F4EFD8]/35">({d.count})</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* HIGHLY RATED */}
              {taste.recentlyRatedHigh.length > 0 && (
                <section className="mb-6">
                  <SectionLabel>RATED 8+ RECENTLY</SectionLabel>
                  <div className={`flex gap-2.5 overflow-x-auto pb-2 ${SCROLL_HIDE}`}>
                    {taste.recentlyRatedHigh.map((log) => (
                      <Link key={log.id} href={`/log/${log.id}`} className="flex shrink-0 flex-col items-center gap-1.5 transition hover:scale-105">
                        <div
                          className="h-[90px] w-[60px] overflow-hidden rounded-lg ring-2"
                          style={{
                            backgroundImage: log.poster_path
                              ? `url(${TMDB_IMG}${log.poster_path})`
                              : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundColor: SURFACE,
                            boxShadow: `0 0 0 2px ${RED}55`,
                          }}
                        />
                        <span className="font-anton text-[10px] text-fc-red">
                          {(log.rating ?? 0).toFixed(1)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* RECENT LOGS — clickable */}
              <section className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-px w-3 bg-fc-red/70" />
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#F4EFD8]/55">RECENT LOGS</span>
                  </div>
                  <Link href="/profile/logged" className="font-mono text-[8px] uppercase tracking-[0.14em] text-fc-red/60 hover:text-fc-red transition">
                    VIEW ALL →
                  </Link>
                </div>
                <div className="space-y-2">
                  {logs.slice(0, 8).map((log) => (
                    <Link
                      key={log.id}
                      href={`/log/${log.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      <div
                        className="h-[48px] w-[32px] shrink-0 overflow-hidden rounded-md"
                        style={{
                          backgroundImage: log.poster_path
                            ? `url(${TMDB_IMG}${log.poster_path})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: SURFACE,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-anton text-[13px] tracking-[0.04em] text-[#F4EFD8]">
                          {log.title}
                        </p>
                        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">
                          {log.watched_date} {log.is_rewatch ? "· REWATCH" : ""}
                        </p>
                      </div>
                      {log.rating != null && (
                        <span className="shrink-0 font-anton text-[16px] text-fc-red">
                          {log.rating.toFixed(1)}
                        </span>
                      )}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#F4EFD8]/20">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          ) : (
            /* EMPTY STATE */
            <section className="py-12 text-center">
              <p className="font-anton text-[20px] text-[#F4EFD8]">
                NO FILMS LOGGED YET
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
                your taste profile builds with every film you log
              </p>
              <Link
                href="/log"
                className="mt-5 inline-block rounded-full bg-fc-red px-6 py-3 font-anton text-[11px] tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(255,74,74,0.35)] active:scale-95"
              >
                LOG YOUR FIRST FILM
              </Link>
            </section>
          )}

          {/* MY CLUBS */}
          {clubs.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-px w-3 bg-fc-red/70" />
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#F4EFD8]/55">YOUR CLUBS</span>
                </div>
                <Link href="/profile/clubs" className="font-mono text-[8px] uppercase tracking-[0.14em] text-fc-red/60 hover:text-fc-red transition">
                  VIEW ALL →
                </Link>
              </div>
              <div className={`flex gap-3 overflow-x-auto pb-2 ${SCROLL_HIDE}`}>
                {clubs.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.id}`}
                    className="flex w-[160px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] transition hover:border-white/[0.12]"
                  >
                    <div
                      className="relative h-[70px] w-full"
                      style={{
                        background: c.accent_gradient || "linear-gradient(135deg, #FF4A4A, #1A1929)",
                      }}
                    >
                      {c.cover_tmdb_backdrop && (
                        <div
                          className="absolute inset-0 opacity-40"
                          style={{
                            backgroundImage: `url(${TMDB_IMG}${c.cover_tmdb_backdrop})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(180deg, transparent 30%, rgba(14,13,24,0.95))" }}
                      />
                      <div className="absolute bottom-2 left-3 right-3">
                        <h3 className="truncate font-anton text-[12px] tracking-[0.04em] text-[#F4EFD8]">
                          {c.name}
                        </h3>
                      </div>
                    </div>
                    <div className="bg-white/[0.02] px-3 py-1.5">
                      <p className="truncate font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">
                        {c.category || "GENERAL"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* BOTTOM NAV */}
        <nav
          className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-white/[0.05] px-2 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
          style={{ backgroundColor: `${BG}F5` }}
        >
          <div className="grid grid-cols-5 items-end">
            <NavItem icon={<IconHome />} label="HOME" href="/home" />
            <NavItem icon={<IconDiscover />} label="DISCOVER" href="/discover" />
            <div className="flex flex-col items-center justify-end pb-0.5">
              <Link
                href="/log"
                aria-label="Log a film"
                className="flex h-[54px] w-[54px] -translate-y-5 items-center justify-center rounded-full bg-fc-red text-[28px] font-light leading-none text-white shadow-[0_10px_30px_rgba(255,74,74,0.5)] ring-4 ring-[#0E0D18] transition-transform hover:scale-105 active:scale-95"
              >
                +
              </Link>
              <span className="-mt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-fc-red/85">
                LOG
              </span>
            </div>
            <NavItem icon={<IconClubs />} label="CLUBS" href="/clubs" />
            <NavItem icon={<IconProfile />} label="YOU" active />
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ============================================================
   SHARED UI
   ============================================================ */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.025] py-3">
      <span className="font-anton text-[22px] leading-[1] text-[#F4EFD8]">{value}</span>
      <span className="mt-1 font-mono text-[7px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
        {label}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-px w-3 bg-fc-red/70" />
      <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#F4EFD8]/55">
        {children}
      </span>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  href,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <span className={active ? "text-fc-red" : "text-[#F4EFD8]/30"}>{icon}</span>
      <span
        className={`font-mono text-[7px] uppercase tracking-[0.18em] ${
          active ? "text-fc-red" : "text-[#F4EFD8]/30"
        }`}
      >
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="flex flex-col items-center gap-1 py-1.5">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className="flex flex-col items-center gap-1 py-1.5">
      {inner}
    </button>
  );
}

/* ---------- icons ---------- */
function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 8.5L10 3L17 8.5V16C17 16.6 16.6 17 16 17H4C3.4 17 3 16.6 3 16V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 17V12H12V17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconDiscover() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8L8.5 9.5L7 13L10.5 11.5L12 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17C3.5 13.4 6.4 10.5 10 10.5C13.6 10.5 16.5 13.4 16.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
