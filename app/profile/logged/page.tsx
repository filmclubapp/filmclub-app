"use client";

/* ============================================================
   FILM CLUB — VIEW ALL LOGGED FILMS
   Full list with sort/filter controls.
   ============================================================ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useUserLogs } from "../../lib/hooks";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

type SortKey = "newest" | "oldest" | "highest" | "lowest" | "title_az" | "title_za";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "NEWEST" },
  { key: "oldest", label: "OLDEST" },
  { key: "highest", label: "HIGHEST RATED" },
  { key: "lowest", label: "LOWEST RATED" },
  { key: "title_az", label: "A → Z" },
  { key: "title_za", label: "Z → A" },
];

export default function AllLoggedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { logs, loading: logsLoading } = useUserLogs(user?.id);
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  const filtered = useMemo(() => {
    let list = [...logs];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.title.toLowerCase().includes(q));
    }

    // Sort
    switch (sort) {
      case "newest":
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "highest":
        list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "lowest":
        list.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
        break;
      case "title_az":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_za":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return list;
  }, [logs, sort, search]);

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
                ALL LOGGED
              </h1>
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">
                {logs.length} {logs.length === 1 ? "FILM" : "FILMS"}
              </p>
            </div>
          </div>
        </header>

        {/* SEARCH + SORT */}
        <div className="border-b border-white/[0.06] px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F4EFD8]/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your logs..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-3 font-sans text-[13px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
            />
          </div>

          {/* Sort pills */}
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

        {/* FILM LIST */}
        <main className="px-4 pb-32 pt-3">
          {logsLoading ? (
            <div className="py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="font-anton text-[18px] text-[#F4EFD8]">
                {search ? "NO MATCHES" : "NO FILMS LOGGED"}
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                {search ? "Try a different search" : "Start logging to build your collection"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((log) => (
                <Link
                  key={log.id}
                  href={`/log/${log.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div
                    className="h-[56px] w-[38px] shrink-0 overflow-hidden rounded-md"
                    style={{
                      backgroundImage: log.poster_path ? `url(${TMDB_IMG}${log.poster_path})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: SURFACE,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8]">
                      {log.title}
                    </p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40">
                      {log.release_year || "—"} · {log.watched_date}
                      {log.is_rewatch ? " · REWATCH" : ""}
                    </p>
                    {log.review_text && (
                      <p className="mt-1 line-clamp-1 font-sans text-[11px] text-[#F4EFD8]/40 italic">
                        &ldquo;{log.review_text}&rdquo;
                      </p>
                    )}
                  </div>
                  {log.rating != null && (
                    <span className="shrink-0 font-anton text-[18px] text-fc-red">
                      {log.rating.toFixed(1)}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#F4EFD8]/20">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
