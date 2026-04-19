"use client";

/* ============================================================
   FILM CLUB — LOG DETAIL
   View a single logged film with its review, rating, tags.
   Owner can edit rating + review inline.
   Spoiler reviews are blurred with eye icon to reveal.
   ============================================================ */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { updateLog } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import type { FilmLog } from "../../lib/supabase";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_WIDE = "https://image.tmdb.org/t/p/w780";

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [log, setLog] = useState<FilmLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState<number>(0);
  const [editReview, setEditReview] = useState("");
  const [editSpoilers, setEditSpoilers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Spoiler reveal
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("film_logs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setLog(data);
        setEditRating(data.rating ?? 0);
        setEditReview(data.review_text ?? "");
        setEditSpoilers(data.has_spoilers ?? false);
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user_id)
          .maybeSingle();
        setProfileData(prof);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!log) return;
    setSaving(true);
    const { data, error } = await updateLog(log.id, {
      rating: editRating > 0 ? editRating : null,
      review_text: editReview.trim() || null,
      has_spoilers: editSpoilers,
    });
    if (data && !error) {
      setLog(data);
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading || authLoading) {
    return <div className="min-h-screen" style={{ backgroundColor: BG }} />;
  }

  if (!log) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <p className="font-anton text-[20px] text-[#F4EFD8]">LOG NOT FOUND</p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
            This film log may have been deleted
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-block rounded-full bg-fc-red px-5 py-2.5 font-anton text-[10px] tracking-[0.14em] text-white"
          >
            BACK TO PROFILE
          </Link>
        </div>
      </div>
    );
  }

  const isOwn = user?.id === log.user_id;
  const displayName = profileData?.display_name || profileData?.username || "member";
  const hasSpoilers = log.has_spoilers && !spoilerRevealed && !isOwn;

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
        {/* FILM BACKDROP HERO */}
        <div className="relative h-[260px] w-full">
          {log.backdrop_path ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${TMDB_WIDE}${log.backdrop_path})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1A0A12] to-[#0E0D18]" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,13,24,0.3) 0%, rgba(14,13,24,0.95) 80%, rgba(14,13,24,1) 100%)" }} />

          {/* Back button */}
          <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-20">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.1] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/70 transition hover:text-[#F4EFD8]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              BACK
            </button>
          </div>

          {/* Edit button (owner only) */}
          {isOwn && !editing && (
            <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.1] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/70 transition hover:text-fc-red"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                EDIT
              </button>
            </div>
          )}

          {/* Film info + poster */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-4">
            {log.poster_path && (
              <div
                className="h-[120px] w-[80px] shrink-0 overflow-hidden rounded-lg border border-white/[0.1] shadow-xl"
                style={{
                  backgroundImage: `url(${TMDB_IMG}${log.poster_path})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
            <div className="flex-1 flex flex-col justify-end">
              <h1 className="font-anton text-[24px] leading-[1.05] tracking-[0.02em] text-[#F4EFD8] drop-shadow-lg">
                {log.title}
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/50">
                {log.release_year} {log.is_rewatch ? "· REWATCH" : ""}
              </p>
            </div>
          </div>
        </div>

        <main className="px-4 pb-12 pt-4">
          {/* EDIT MODE */}
          {editing ? (
            <div className="space-y-4 mb-5">
              {/* Edit Rating */}
              <div className="rounded-2xl border border-fc-red/20 bg-white/[0.03] p-4">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40 mb-3">RATING</p>
                <div className="flex items-center gap-3">
                  <span className="font-anton text-[36px] leading-none text-fc-red">
                    {editRating > 0 ? editRating.toFixed(1) : "—"}
                  </span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={editRating}
                      onChange={(e) => setEditRating(parseFloat(e.target.value))}
                      className="w-full accent-[#FF4A4A]"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[7px] text-[#F4EFD8]/25">0</span>
                      <span className="font-mono text-[7px] text-[#F4EFD8]/25">10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Review */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40 mb-3">REVIEW</p>
                <textarea
                  value={editReview}
                  onChange={(e) => setEditReview(e.target.value)}
                  rows={5}
                  placeholder="Your thoughts..."
                  className="w-full resize-none bg-transparent font-sans text-[14px] leading-[1.6] text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSpoilers}
                      onChange={(e) => setEditSpoilers(e.target.checked)}
                      className="accent-[#FF4A4A]"
                    />
                    <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/50">
                      CONTAINS SPOILERS
                    </span>
                  </label>
                  <span className="font-mono text-[8px] text-[#F4EFD8]/25">{editReview.length} chars</span>
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-fc-red py-3 text-center font-anton text-[11px] tracking-[0.12em] text-white shadow-[0_6px_18px_rgba(255,74,74,0.3)] transition active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? "SAVING..." : "SAVE CHANGES"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditRating(log.rating ?? 0);
                    setEditReview(log.review_text ?? "");
                    setEditSpoilers(log.has_spoilers ?? false);
                  }}
                  className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/60 transition hover:text-[#F4EFD8]"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* RATING */}
              {log.rating != null && (
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-anton text-[42px] leading-none text-fc-red">
                      {log.rating.toFixed(1)}
                    </span>
                    <span className="font-mono text-[12px] text-[#F4EFD8]/30">/10</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: `${INK}0A` }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(log.rating / 10) * 100}%`,
                          background: `linear-gradient(90deg, ${RED}88, ${RED})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* WHO LOGGED */}
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-anton text-[11px]"
                  style={{ background: `linear-gradient(135deg, ${RED}, #9C7BFF)`, color: BG }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-anton text-[12px] tracking-[0.02em] text-[#F4EFD8]">
                    {isOwn ? "You" : displayName}
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/35">
                    Logged {formatDate(log.watched_date || log.created_at)}
                  </p>
                </div>
              </div>

              {/* REVIEW TEXT with spoiler blur */}
              {log.review_text ? (
                <section className="mb-5">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    {log.has_spoilers && (
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-fc-red/20">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-fc-red" />
                          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-fc-red">
                            CONTAINS SPOILERS
                          </span>
                        </div>
                        {hasSpoilers && (
                          <button
                            type="button"
                            onClick={() => setSpoilerRevealed(true)}
                            className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 transition hover:bg-white/[0.1]"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4EFD8" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#F4EFD8]/60">REVEAL</span>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <p
                        className={`font-sans text-[14px] leading-[1.6] text-[#F4EFD8]/80 whitespace-pre-wrap transition-all duration-300 ${
                          hasSpoilers ? "blur-[6px] select-none" : ""
                        }`}
                      >
                        {log.review_text}
                      </p>
                      {hasSpoilers && (
                        <button
                          type="button"
                          onClick={() => setSpoilerRevealed(true)}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/[0.15] px-4 py-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4EFD8" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]">TAP TO REVEAL SPOILERS</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="mb-5">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/30">
                      No written review
                    </p>
                  </div>
                </section>
              )}

              {/* METADATA */}
              <section className="mb-5 grid grid-cols-2 gap-2">
                <MetaCard label="WATCHED" value={formatDate(log.watched_date || log.created_at)} />
                <MetaCard label="RATING" value={log.rating != null ? `${log.rating.toFixed(1)}/10` : "—"} />
                <MetaCard label="TYPE" value={log.is_rewatch ? "REWATCH" : "FIRST WATCH"} />
                <MetaCard label="SPOILERS" value={log.has_spoilers ? "YES" : "NO"} />
              </section>
            </>
          )}

          {/* ACTIONS */}
          <div className="flex gap-2">
            <Link
              href="/log"
              className="flex-1 rounded-xl bg-fc-red py-3 text-center font-anton text-[11px] tracking-[0.12em] text-white shadow-[0_6px_18px_rgba(255,74,74,0.3)] transition active:scale-[0.98]"
            >
              LOG ANOTHER
            </Link>
            <Link
              href="/profile"
              className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/60 transition hover:text-[#F4EFD8]"
            >
              PROFILE
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/35 mb-1">{label}</p>
      <p className="font-anton text-[13px] tracking-[0.04em] text-[#F4EFD8]">{value}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
