"use client";

/* ============================================================
   FILM CLUB — WATCHLIST
   Films you want to watch. Simple, beautiful, functional.
   ============================================================ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { useWatchlist } from "../lib/hooks";
import { searchFilms, type TMDBFilm } from "../lib/tmdb";
import NotificationBell from "../components/NotificationBell";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { items, loading, add, remove } = useWatchlist(user?.id);

  // Search to add
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TMDBFilm[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const data = await searchFilms(search);
      setResults(data.slice(0, 8));
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleAdd = async (film: TMDBFilm) => {
    await add(
      film.id,
      film.title,
      film.poster_path,
      film.release_date ? parseInt(film.release_date.slice(0, 4)) : null
    );
    setSearch("");
    setResults([]);
    setShowSearch(false);
  };

  const watchlistTmdbIds = new Set(items.map((i: any) => i.tmdb_id));

  if (authLoading || !user)
    return <div style={{ backgroundColor: BG, minHeight: "100vh" }} />;

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
                WATCHLIST
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] transition hover:border-fc-red/40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showSearch ? RED : "#F4EFD8"} strokeWidth="2" strokeLinecap="round">
                  {showSearch ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <path d="M12 5v14M5 12h14" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* SEARCH TO ADD */}
        {showSearch && (
          <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F4EFD8]/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search films to add..."
                autoFocus
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 font-sans text-[13px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
              />
            </div>

            {/* Search results */}
            {results.length > 0 && (
              <div className="mt-2 space-y-1 max-h-[300px] overflow-y-auto">
                {results.map((film) => {
                  const alreadyAdded = watchlistTmdbIds.has(film.id);
                  return (
                    <button
                      key={film.id}
                      type="button"
                      onClick={() => !alreadyAdded && handleAdd(film)}
                      disabled={alreadyAdded}
                      className="flex w-full items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.04] disabled:opacity-40"
                    >
                      <div
                        className="h-[42px] w-[28px] shrink-0 overflow-hidden rounded-md"
                        style={{
                          backgroundImage: film.poster_path ? `url(${TMDB_IMG}${film.poster_path})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: SURFACE,
                        }}
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate font-anton text-[12px] text-[#F4EFD8]">{film.title}</p>
                        <p className="font-mono text-[8px] text-[#F4EFD8]/40">
                          {film.release_date?.slice(0, 4) || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] text-fc-red/60">
                        {alreadyAdded ? "ADDED" : "+ ADD"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {searching && (
              <p className="mt-2 font-mono text-[9px] text-[#F4EFD8]/30 text-center">Searching...</p>
            )}
          </div>
        )}

        {/* WATCHLIST */}
        <main className="px-4 pb-32 pt-3">
          {loading ? (
            <div className="py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">Loading...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-anton text-[20px] text-[#F4EFD8]">WATCHLIST EMPTY</p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                Tap + above to add films you want to watch
              </p>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="mt-5 inline-block rounded-full bg-fc-red px-6 py-3 font-anton text-[11px] tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(255,74,74,0.35)] active:scale-95"
              >
                ADD YOUR FIRST FILM
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/35 mb-3">
                {items.length} {items.length === 1 ? "FILM" : "FILMS"} TO WATCH
              </p>
              {items.map((item: any) => (
                <div
                  key={item.id || item.tmdb_id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 transition hover:border-white/[0.12]"
                >
                  <div
                    className="h-[56px] w-[38px] shrink-0 overflow-hidden rounded-md"
                    style={{
                      backgroundImage: item.poster_path ? `url(${TMDB_IMG}${item.poster_path})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: SURFACE,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8]">
                      {item.title}
                    </p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                      {item.release_year || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href="/log"
                      className="rounded-full bg-fc-red/15 border border-fc-red/30 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-fc-red hover:bg-fc-red/25 transition"
                    >
                      LOG
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(item.tmdb_id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[#F4EFD8]/40 hover:text-fc-red hover:border-fc-red/30 transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
            <NavItem icon={<IconProfile />} label="YOU" href="/profile" />
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ---------- Nav items ---------- */
function NavItem({ icon, label, active, href }: { icon: React.ReactNode; label: string; active?: boolean; href?: string }) {
  const inner = (
    <>
      <span className={active ? "text-fc-red" : "text-[#F4EFD8]/30"}>{icon}</span>
      <span className={`font-mono text-[7px] uppercase tracking-[0.18em] ${active ? "text-fc-red" : "text-[#F4EFD8]/30"}`}>{label}</span>
    </>
  );
  if (href) return <Link href={href} className="flex flex-col items-center gap-1 py-1.5">{inner}</Link>;
  return <button type="button" className="flex flex-col items-center gap-1 py-1.5">{inner}</button>;
}

function IconHome() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3L17 8.5V16C17 16.6 16.6 17 16 17H4C3.4 17 3 16.6 3 16V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 17V12H12V17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>; }
function IconDiscover() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8L8.5 9.5L7 13L10.5 11.5L12 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>; }
function IconClubs() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><circle cx="5" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" /><circle cx="15" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M3 16c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function IconProfile() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3.5 17C3.5 13.4 6.4 10.5 10 10.5C13.6 10.5 16.5 13.4 16.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
