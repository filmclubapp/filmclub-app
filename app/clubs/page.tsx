"use client";

/* ============================================================
   FILM CLUB — CLUBS
   The social layer. Search, browse, join, discover.
   ============================================================ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { ensureMvpClubs, useClubs, useClubMembership, useMyClubs } from "../lib/hooks";
import NotificationBell from "../components/NotificationBell";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/* Trending clubs placeholder data */
const TRENDING_PLACEHOLDERS = [
  { name: "Sundance Selects", tagline: "indie excellence", gradient: "linear-gradient(135deg, #E8D44D, #1A1929)" },
  { name: "Horror After Dark", tagline: "lights off, volume up", gradient: "linear-gradient(135deg, #8B0000, #1A1929)" },
  { name: "Studio Ghibli", tagline: "every frame a painting", gradient: "linear-gradient(135deg, #4ECDC4, #1A1929)" },
  { name: "Tarantino Universe", tagline: "dialogue is cinema", gradient: "linear-gradient(135deg, #FF6B35, #1A1929)" },
];

export default function ClubsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { clubs, loading: clubsLoading, refresh } = useClubs();
  const { clubs: myClubs } = useMyClubs(user?.id);
  const { join } = useClubMembership(user?.id);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "trending" | "my">("browse");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      await ensureMvpClubs(user.id);
      refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [localJoined, setLocalJoined] = useState<Set<string>>(new Set());
  const myIds = useMemo(() => {
    const ids = new Set(myClubs.map((c: any) => c.id));
    localJoined.forEach((id) => ids.add(id));
    return ids;
  }, [myClubs, localJoined]);

  const filteredClubs = useMemo(() => {
    if (!search.trim()) return clubs;
    const q = search.toLowerCase();
    return clubs.filter(
      (c: any) =>
        c.name.toLowerCase().includes(q) ||
        (c.tagline && c.tagline.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [clubs, search]);

  const handleJoin = async (clubId: string) => {
    setLocalJoined((prev) => new Set(prev).add(clubId));
    await join(clubId);
    refresh();
  };

  if (loading || clubsLoading) {
    return <div className="min-h-screen" style={{ backgroundColor: BG }} />;
  }

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
          background: "radial-gradient(120% 80% at 50% -10%, rgba(255,74,74,0.08), transparent 55%)",
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
                CLUBS
              </h1>
            </div>
            <NotificationBell />
          </div>

          {/* SEARCH BAR */}
          <div className="mt-3 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F4EFD8]/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clubs..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-4 py-2.5 font-mono text-[11px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:border-fc-red/40 focus:outline-none transition"
            />
          </div>

          {/* TABS */}
          <div className="mt-3 flex gap-1">
            {(["browse", "trending", "my"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] transition ${
                  activeTab === tab
                    ? "bg-fc-red text-white"
                    : "bg-white/[0.04] text-[#F4EFD8]/45 hover:text-[#F4EFD8]/80"
                }`}
              >
                {tab === "my" ? "MY CLUBS" : tab}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pb-32 pt-4">
          {clubs.length === 0 && !clubsLoading && (
            <div className="mb-4 rounded-2xl border border-fc-red/20 bg-fc-red/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fc-red mb-1">NO CLUBS FOUND</p>
              <p className="font-sans text-[12px] text-[#F4EFD8]/60 leading-relaxed">
                Run <span className="font-mono text-[#F4EFD8]/80">supabase/setup.sql</span> in Supabase SQL Editor.
              </p>
            </div>
          )}

          {/* BROWSE TAB */}
          {activeTab === "browse" && (
            <div className="space-y-3">
              {filteredClubs.map((club: any) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  isMember={myIds.has(club.id)}
                  onJoin={() => handleJoin(club.id)}
                />
              ))}
              {search && filteredClubs.length === 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">
                    No clubs match "{search}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TRENDING TAB */}
          {activeTab === "trending" && (
            <div>
              <div className="mb-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8 8 4 12 4 16C4 20 8 22 12 22C16 22 20 20 20 16C20 12 16 8 12 2Z" fill="#FF6B35" />
                    <path d="M12 8C10 12 8 14 8 16C8 18.2 9.8 20 12 20C14.2 20 16 18.2 16 16C16 14 14 12 12 8Z" fill="#FFD86F" />
                  </svg>
                  <span className="font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8]">TRENDING</span>
                </div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                  Popular clubs rising fast this week
                </p>
              </div>

              <div className="space-y-2.5">
                {TRENDING_PLACEHOLDERS.map((t, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-4"
                    style={{ background: t.gradient }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.14em] text-[#F4EFD8]/60">
                          COMING SOON
                        </span>
                      </div>
                      <h3 className="font-anton text-[16px] tracking-[0.04em] text-[#F4EFD8]">{t.name}</h3>
                      <p className="font-sans text-[11px] italic text-[#F4EFD8]/50">{t.tagline}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                <p className="font-anton text-[16px] text-[#F4EFD8]">MORE CLUBS DROPPING SOON</p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                  Community-created clubs are on the roadmap
                </p>
              </div>
            </div>
          )}

          {/* MY CLUBS TAB */}
          {activeTab === "my" && (
            <div>
              {myClubs.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                  <p className="font-anton text-[18px] text-[#F4EFD8]">NO CLUBS YET</p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                    Join a club to start the conversation
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className="mt-4 rounded-full bg-fc-red px-5 py-2.5 font-anton text-[10px] tracking-[0.14em] text-white"
                  >
                    BROWSE CLUBS
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myClubs.map((club: any) => (
                    <ClubCard
                      key={club.id}
                      club={club}
                      isMember={true}
                      onJoin={() => {}}
                    />
                  ))}
                </div>
              )}
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
            <NavItem icon={<IconClubs />} label="CLUBS" active />
            <NavItem icon={<IconProfile />} label="YOU" href="/profile" />
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ============================================================
   CLUB CARD — rich card with backdrop still
   ============================================================ */
function ClubCard({
  club,
  isMember,
  onJoin,
}: {
  club: any;
  isMember: boolean;
  onJoin: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition hover:border-white/[0.12]">
      <Link href={`/clubs/${club.id}`} className="block">
        <div className="relative h-[120px] w-full">
          <div className="absolute inset-0" style={{ background: club.accent_gradient || "linear-gradient(135deg, #FF4A4A, #1A1929)" }} />
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
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 20%, rgba(14,13,24,0.95) 100%)" }} />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-anton text-[18px] tracking-[0.04em] text-[#F4EFD8] drop-shadow-lg">{club.name}</h3>
            <p className="mt-0.5 font-sans text-[11px] italic text-[#F4EFD8]/60">{club.tagline}</p>
          </div>
          {/* Category badge */}
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.1] px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/70">
              {club.category || "GENERAL"}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/45">
            {(club.member_count ?? 0).toLocaleString()} members
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/25">·</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/45">
            {(club.post_count ?? 0).toLocaleString()} posts
          </span>
        </div>
        {isMember ? (
          <Link
            href={`/clubs/${club.id}`}
            className="rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/65 transition hover:text-[#F4EFD8] hover:border-white/[0.2]"
          >
            ENTER
          </Link>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="rounded-full bg-fc-red px-4 py-1.5 font-anton text-[10px] tracking-[0.12em] text-white shadow-[0_4px_12px_rgba(255,74,74,0.3)] transition hover:shadow-[0_6px_16px_rgba(255,74,74,0.4)] active:scale-95"
          >
            JOIN
          </button>
        )}
      </div>
    </article>
  );
}

/* ============================================================
   SHARED UI
   ============================================================ */
function NavItem({ icon, label, active, href }: { icon: React.ReactNode; label: string; active?: boolean; href?: string }) {
  const inner = (
    <>
      <span className={active ? "text-fc-red" : "text-[#F4EFD8]/30"}>{icon}</span>
      <span className={`font-mono text-[7px] uppercase tracking-[0.18em] ${active ? "text-fc-red" : "text-[#F4EFD8]/30"}`}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="flex flex-col items-center gap-1 py-1.5">{inner}</Link>
  ) : (
    <button type="button" className="flex flex-col items-center gap-1 py-1.5">{inner}</button>
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
