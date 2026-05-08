"use client";

/* ============================================================
   FILM CLUB — VIEW ALL MY CLUBS
   Full list with search/filter.
   ============================================================ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useMyClubs } from "../../lib/hooks";

const BG = "#0E0D18";
const INK = "#F4EFD8";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

type SortKey = "newest" | "name_az" | "name_za";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "NEWEST" },
  { key: "name_az", label: "A → Z" },
  { key: "name_za", label: "Z → A" },
];

export default function AllClubsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { clubs, loading: clubsLoading } = useMyClubs(user?.id);
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  const filtered = useMemo(() => {
    let list = [...clubs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.tagline?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "newest":
        list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "name_az":
        list.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name_za":
        list.sort((a: any, b: any) => (b.name || "").localeCompare(a.name || ""));
        break;
    }

    return list;
  }, [clubs, sort, search]);

  if (loading || !user)
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
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.1] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/70 transition hover:text-[#F4EFD8]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              PROFILE
            </Link>
            <div>
              <h1 className="font-anton text-[20px] leading-[1] tracking-[0.04em] text-[#F4EFD8]">
                YOUR CLUBS
              </h1>
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">
                {clubs.length} {clubs.length === 1 ? "CLUB" : "CLUBS"} JOINED
              </p>
            </div>
          </div>
        </header>

        {/* SEARCH + SORT */}
        <div className="border-b border-white/[0.06] px-4 py-3 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F4EFD8]/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your clubs..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 font-sans text-[13px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] transition ${
                  sort === opt.key
                    ? "bg-fc-red text-white"
                    : "border border-white/[0.08] bg-white/[0.03] text-[#F4EFD8]/50 hover:text-[#F4EFD8]/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* CLUBS LIST */}
        <main className="px-4 pb-32 pt-3">
          {clubsLoading ? (
            <div className="py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="font-anton text-[18px] text-[#F4EFD8]">
                {search ? "NO MATCHES" : "NO CLUBS JOINED"}
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                {search ? "Try a different search" : "Browse clubs and join the conversation"}
              </p>
              {!search && (
                <Link
                  href="/clubs"
                  className="mt-4 inline-block rounded-full bg-fc-red px-6 py-2.5 font-anton text-[11px] tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(255,74,74,0.35)] active:scale-95"
                >
                  BROWSE CLUBS
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((club: any) => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.id}`}
                  className="block overflow-hidden rounded-2xl border border-white/[0.06] transition hover:border-white/[0.12]"
                >
                  {/* Backdrop */}
                  <div className="relative h-[100px] w-full">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: club.accent_gradient || `linear-gradient(135deg, ${RED}, #1A1929)`,
                      }}
                    />
                    {club.cover_tmdb_backdrop && (
                      <div
                        className="absolute inset-0 opacity-50"
                        style={{
                          backgroundImage: `url(${TMDB_IMG}${club.cover_tmdb_backdrop})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center top",
                        }}
                      />
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(14,13,24,0.95))" }} />
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/[0.1] px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/60">
                        {club.category || "GENERAL"}
                      </span>
                      <h3 className="mt-1.5 font-anton text-[18px] leading-[1] tracking-[0.02em] text-[#F4EFD8] drop-shadow-lg">
                        {club.name}
                      </h3>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] px-4 py-2.5">
                    <p className="font-sans text-[11px] italic text-[#F4EFD8]/50 line-clamp-1">
                      {club.tagline}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
