"use client";

/* ============================================================
   FILM OF THE WEEK — Voting widget
   Members nominate films from TMDB search, then vote.
   Top voted = winner displayed at top.
   ============================================================ */

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useFilmOfWeek, daysUntilNextMonday } from "../lib/hooks";
import { searchFilms, posterURL, type TMDBFilm } from "../lib/tmdb";

const SURFACE = "#17162A";
const RED = "#FF4A4A";

interface Props {
  clubId: string;
  userId: string | undefined;
  canPost: boolean;
}

export default function FilmOfTheWeek({ clubId, userId, canPost }: Props) {
  const { nominations, winner, loading, nominate, vote } = useFilmOfWeek(clubId, userId);
  const [showNominate, setShowNominate] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TMDBFilm[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const daysLeft = daysUntilNextMonday();

  // Debounced TMDB search
  useEffect(() => {
    const q = search.trim();
    if (!q) { setResults([]); return; }
    setSearching(true);
    const handle = setTimeout(() => {
      searchFilms(q)
        .then((films) => setResults(films.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const handleNominate = useCallback(async (film: TMDBFilm) => {
    if (submitting) return;
    setSubmitting(true);
    await nominate({
      tmdb_id: film.id,
      title: film.title,
      poster_path: film.poster_path,
    });
    setSubmitting(false);
    setSearch("");
    setResults([]);
    setShowNominate(false);
  }, [nominate, submitting]);

  return (
    <div className="mb-4 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/[0.06] to-orange-600/[0.03] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">🎬</span>
          <div>
            <p className="font-anton text-[12px] tracking-[0.04em] text-[#F4EFD8]">FILM OF THE WEEK</p>
            <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-amber-300/60">
              NOMINATE · VOTE · WATCH
            </p>
          </div>
        </div>
        <div className="rounded-full bg-amber-500/15 border border-amber-400/25 px-2 py-0.5">
          <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-amber-300">
            {daysLeft}d LEFT
          </span>
        </div>
      </div>

      {/* Empty / loading */}
      {loading && (
        <p className="py-4 text-center font-mono text-[9px] tracking-widest text-[#F4EFD8]/30">
          loading ballot…
        </p>
      )}

      {!loading && nominations.length === 0 && !showNominate && (
        <div className="rounded-xl bg-black/20 p-3 text-center">
          <p className="font-sans text-[12px] italic text-[#F4EFD8]/50">
            No nominations yet. Be the first.
          </p>
          {canPost && (
            <button
              type="button"
              onClick={() => setShowNominate(true)}
              className="mt-2 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-500/30 transition"
            >
              + NOMINATE A FILM
            </button>
          )}
        </div>
      )}

      {/* Nominations list */}
      {!loading && nominations.length > 0 && !showNominate && (
        <div className="space-y-2">
          {nominations.slice(0, 4).map((n, i) => {
            const totalVotes = nominations.reduce((s, x) => s + (x.vote_count ?? 0), 0);
            const pct = totalVotes > 0 ? Math.round(((n.vote_count ?? 0) / totalVotes) * 100) : 0;
            const isWinner = i === 0 && (n.vote_count ?? 0) > 0;
            return (
              <button
                key={n.id}
                type="button"
                disabled={!canPost}
                onClick={() => vote(n.id)}
                className={`relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition disabled:opacity-60 ${
                  n.user_voted
                    ? "border-amber-400/60 bg-amber-500/[0.08]"
                    : "border-white/[0.05] bg-black/20 hover:border-amber-400/30"
                }`}
              >
                {/* Vote bar fill */}
                <div
                  className="absolute inset-0 bg-amber-500/[0.04] transition-all"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center gap-3">
                  <div className="relative h-[50px] w-[34px] shrink-0 overflow-hidden rounded-md">
                    <Image src={posterURL(n.poster_path, "w185")} alt={n.title} fill className="object-cover" sizes="34px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-anton text-[13px] leading-tight text-[#F4EFD8] truncate">
                      {n.title.toUpperCase()}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {isWinner && (
                        <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-amber-300">
                          ★ LEADING
                        </span>
                      )}
                      <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#F4EFD8]/40">
                        {n.vote_count ?? 0} {(n.vote_count ?? 0) === 1 ? "vote" : "votes"}
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                    n.user_voted
                      ? "border-amber-400 bg-amber-500/30 text-amber-200"
                      : "border-white/20 bg-transparent text-white/40"
                  }`}>
                    {n.user_voted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span className="font-anton text-[12px]">{pct}%</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {canPost && (
            <button
              type="button"
              onClick={() => setShowNominate(true)}
              className="w-full rounded-full border border-amber-400/30 bg-amber-500/[0.06] py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-amber-300 hover:bg-amber-500/15 transition"
            >
              + NOMINATE ANOTHER
            </button>
          )}
        </div>
      )}

      {/* Nominate flow */}
      {showNominate && (
        <div className="mt-2 rounded-xl bg-black/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-amber-300/80">NOMINATE A FILM</p>
            <button
              type="button"
              onClick={() => { setShowNominate(false); setSearch(""); setResults([]); }}
              className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40 hover:text-[#F4EFD8]/70"
            >
              CANCEL
            </button>
          </div>
          <input
            type="search"
            placeholder="search a film..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg px-3 py-2 font-mono text-xs text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            style={{ backgroundColor: SURFACE }}
            autoFocus
          />
          <div className="mt-2 max-h-[280px] overflow-y-auto">
            {searching && (
              <p className="py-3 text-center font-mono text-[9px] text-[#F4EFD8]/30">searching…</p>
            )}
            {!searching && results.length === 0 && search.trim() && (
              <p className="py-3 text-center font-mono text-[9px] text-[#F4EFD8]/30">no results</p>
            )}
            {results.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={submitting}
                onClick={() => handleNominate(f)}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-white/[0.04] disabled:opacity-50"
              >
                <div className="relative h-[42px] w-[28px] shrink-0 overflow-hidden rounded">
                  <Image src={posterURL(f.poster_path, "w185")} alt={f.title} fill className="object-cover" sizes="28px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[12px] text-[#F4EFD8] truncate">{f.title}</p>
                  <p className="font-mono text-[8px] text-[#F4EFD8]/40">{f.release_date?.slice(0, 4) || ""}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {winner && !showNominate && (
        <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[0.18em] text-amber-300/40">
          tap any film to vote · 1 vote per week
        </p>
      )}
    </div>
  );
}
