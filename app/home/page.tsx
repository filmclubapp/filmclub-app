"use client";

/* ============================================================
   HOME — Aggregated feed from all clubs + activity
   MVP version: shows streak, Film of the Week, recent
   activity across all clubs the user has joined.
   ============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import { posterURL } from "../lib/tmdb";
import { useMyClubs, useUserLogs, computeStreak, streakNudgeState } from "../lib/hooks";
import NotificationBell from "../components/NotificationBell";
import DailyPromptCard from "../components/DailyPromptCard";
import TasteTribeCard from "../components/TasteTribeCard";
import InviteUnlockCard from "../components/InviteUnlockCard";
import SundayRevealBanner from "../components/SundayRevealBanner";
import type { ClubPost, FilmLog } from "../lib/supabase";

const BG = "#1E1D2B";
const SURFACE = "#252436";

/* ---- Nav icons ---- */
function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconDiscover() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0116 0" />
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
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ---- Film of the Week (computed from most-logged film this week across all clubs) ---- */
interface FilmOfWeek {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  avg_rating: number;
  log_count: number;
}

function useFilmOfTheWeek() {
  const [film, setFilm] = useState<FilmOfWeek | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Get logs from the past 7 days
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: logs } = await supabase
        .from("film_logs")
        .select("tmdb_id, title, poster_path, rating")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!logs || logs.length === 0) { setLoading(false); return; }

      // Group by tmdb_id, find most logged
      const groups = new Map<number, { title: string; poster_path: string | null; ratings: number[] }>();
      for (const l of logs) {
        if (!groups.has(l.tmdb_id)) {
          groups.set(l.tmdb_id, { title: l.title, poster_path: l.poster_path, ratings: [] });
        }
        if (l.rating) groups.get(l.tmdb_id)!.ratings.push(l.rating);
      }

      // Sort by log count descending
      const sorted = [...groups.entries()]
        .map(([tmdb_id, g]) => ({
          tmdb_id,
          title: g.title,
          poster_path: g.poster_path,
          log_count: g.ratings.length || 1,
          avg_rating: g.ratings.length > 0
            ? g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length
            : 0,
        }))
        .sort((a, b) => b.log_count - a.log_count);

      setFilm(sorted[0] ?? null);
      setLoading(false);
    })();
  }, []);

  return { film, loading };
}

/* ---- Aggregated feed (all posts from user's clubs) ---- */
function useHomeFeed(clubIds: string[]) {
  const [posts, setPosts] = useState<(ClubPost & { club_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (clubIds.length === 0) { setLoading(false); return; }
    const { data } = await supabase
      .from("club_posts")
      .select("*, profiles(*), film_logs(*), clubs(name)")
      .in("club_id", clubIds)
      .order("created_at", { ascending: false })
      .limit(30);

    const withClubName = (data ?? []).map((p: any) => ({
      ...p,
      club_name: p.clubs?.name ?? "",
    }));
    setPosts(withClubName);
    setLoading(false);
  }, [clubIds]);

  useEffect(() => { fetch(); }, [fetch]);

  // Re-fetch on auth refresh
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") fetch();
    });
    return () => subscription.unsubscribe();
  }, [fetch]);

  return { posts, loading, refresh: fetch };
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const { clubs } = useMyClubs(user?.id);
  const { logs } = useUserLogs(user?.id);
  const { film: fotw } = useFilmOfTheWeek();

  const clubIds = clubs.map((c) => c.id);
  const { posts, loading: feedLoading } = useHomeFeed(clubIds);

  const streak = computeStreak(logs, profile?.created_at);
  const nudge = streakNudgeState(logs, profile?.created_at);
  const displayName = profile?.display_name || "Film lover";

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-[480px]">
        {/* Header */}
        <header
          className="fixed left-1/2 top-0 z-40 w-full max-w-[480px] -translate-x-1/2 border-b border-white/[0.06] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]"
          style={{ backgroundColor: BG }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-anton text-[22px] tracking-[0.08em] text-fc-red">FILM CLUB</h1>
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="px-4 pt-[calc(5rem+env(safe-area-inset-top))]">

          {/* Greeting + streak (inline, compact) */}
          <section className="mb-5 flex items-center justify-between">
            <p className="font-sans text-[15px] text-white/60">
              Hey <span className="font-medium text-white/90">{displayName}</span>
            </p>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
                <span className="text-sm leading-none">🔥</span>
                <span className="font-anton text-[14px] leading-none text-fc-red">{streak}</span>
                <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/35">day</span>
              </div>
            )}
          </section>

          {/* SUNDAY REVEAL — only on Sun/Mon when there's a winner */}
          <SundayRevealBanner clubIds={clubIds} />

          {/* TASTE TRIBE — first-session identity card */}
          <TasteTribeCard userId={user?.id} profile={profile} />

          {/* DAILY PROMPT — highest-ROI daily activation */}
          <DailyPromptCard userId={user?.id} />

          {/* INVITE UNLOCK — appears once user has 3+ interactions */}
          <InviteUnlockCard userId={user?.id} />

          {/* Streak nudge — danger state: subtle inline prompt, not a full banner */}
          {nudge === "danger" && streak > 0 && (
            <Link
              href="/log"
              className="mb-4 flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/[0.06] px-3.5 py-2.5 transition hover:border-orange-400/35"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-300/80">
                🔥 Log today — {streak}-day streak on the line
              </span>
              <span className="ml-auto font-mono text-[8px] text-orange-300/60">LOG →</span>
            </Link>
          )}

          {/* Film of the Week */}
          {fotw && (
            <section className="mb-5 overflow-hidden rounded-2xl border border-white/[0.08]" style={{ background: "linear-gradient(135deg, #27152f 0%, #1a1d33 48%, #142325 100%)" }}>
              <div className="flex gap-4 p-4">
                <div className="relative h-[100px] w-[67px] shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={posterURL(fotw.poster_path, "w185")}
                    alt={fotw.title}
                    fill
                    className="object-cover"
                    sizes="67px"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-fc-red/80">FILM OF THE WEEK</p>
                  <p className="mt-1.5 font-anton text-[20px] leading-tight tracking-wide text-white">
                    {fotw.title.toUpperCase()}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {fotw.avg_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-anton text-[16px] text-fc-red">{fotw.avg_rating.toFixed(1)}</span>
                        <span className="font-mono text-[7px] text-white/30">AVG</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="font-anton text-[16px] text-white/70">{fotw.log_count}</span>
                      <span className="font-mono text-[7px] text-white/30">{fotw.log_count === 1 ? "LOG" : "LOGS"}</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Activity feed */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">CLUB ACTIVITY</p>
            </div>

            {feedLoading && (
              <p className="py-8 text-center font-mono text-xs tracking-widest text-white/30">loading…</p>
            )}

            {!feedLoading && posts.length === 0 && (
              <div className="rounded-2xl border border-white/[0.06] p-8 text-center" style={{ backgroundColor: SURFACE }}>
                <p className="text-2xl">🎬</p>
                <p className="mt-3 font-anton text-[18px] tracking-wide text-white/70">NO ACTIVITY YET</p>
                <p className="mt-1 font-sans text-xs font-light italic text-white/40">
                  Join clubs and start logging films to fill your feed.
                </p>
                <Link
                  href="/clubs"
                  className="mt-4 inline-block rounded-full border border-fc-red px-5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-fc-red transition hover:bg-fc-red/10"
                >
                  EXPLORE CLUBS
                </Link>
              </div>
            )}

            {!feedLoading && posts.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {posts.map((post) => (
                  <FeedCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
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

/* ---- Feed card ---- */
function FeedCard({ post }: { post: ClubPost & { club_name?: string } }) {
  const profile = post.profiles;
  const filmLog = post.film_logs;
  const name = profile?.display_name || profile?.username || "Someone";
  const avatarInitial = name.charAt(0).toUpperCase();

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]" style={{ backgroundColor: SURFACE }}>
      <div className="p-3.5">
        {/* Header: avatar + name + club + time */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fc-red/20 font-anton text-xs text-fc-red">
            {avatarInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-[12px] font-medium text-white/90 truncate">{name}</span>
              {(post as any).club_name && (
                <>
                  <span className="font-mono text-[8px] text-white/20">in</span>
                  <span className="font-mono text-[9px] text-fc-red/70 truncate">{(post as any).club_name}</span>
                </>
              )}
            </div>
            <p className="font-mono text-[7px] text-white/25">{getTimeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Film log card if shared */}
        {filmLog && (
          <Link href={`/log/${filmLog.id}`} className="mt-3 flex gap-3 rounded-lg bg-white/[0.03] p-2.5 transition hover:bg-white/[0.06]">
            <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-md">
              <Image
                src={posterURL(filmLog.poster_path, "w185")}
                alt={filmLog.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-anton text-[14px] leading-tight tracking-wide text-white/90">
                {filmLog.title.toUpperCase()}
              </p>
              {filmLog.rating && (
                <p className="mt-1 font-anton text-[16px] text-fc-red">{filmLog.rating.toFixed(1)}</p>
              )}
              {filmLog.review_text && (
                <p className="mt-1 font-sans text-[11px] font-light text-white/45 line-clamp-2">
                  {filmLog.review_text}
                </p>
              )}
            </div>
          </Link>
        )}

        {/* Text post body */}
        {post.body && !filmLog && (
          <p className="mt-2.5 font-sans text-[13px] font-light leading-relaxed text-white/70">
            {post.body}
          </p>
        )}

        {/* Body when film + text */}
        {post.body && filmLog && (
          <p className="mt-2 font-sans text-[12px] font-light italic text-white/50">
            {post.body}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---- Nav item ---- */
function NavItem({ icon, label, active, href }: { icon: React.ReactNode; label: string; active?: boolean; href?: string }) {
  const inner = (
    <>
      <span className={active ? "text-fc-red" : "text-[#E8E4D4]/20"}>{icon}</span>
      <span className={`font-mono text-[6.5px] uppercase tracking-wider ${active ? "text-fc-red/90" : "text-[#E8E4D4]/20"}`}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="flex flex-col items-center justify-end gap-1 pb-0.5">
      {inner}
    </Link>
  ) : (
    <button type="button" className="flex flex-col items-center justify-end gap-1 pb-0.5">
      {inner}
    </button>
  );
}
