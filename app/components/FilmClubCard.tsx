"use client";

/* ============================================================
   FILM CLUB CARD — The viral shareable card
   Generated after logging a film. Designed to be screenshotted
   or shared to Instagram Stories, TikTok, X, etc.
   Beautiful card with movie poster, title, rating, short review.
   ============================================================ */

import { useRef } from "react";

const BG = "#0E0D18";
const RED = "#FF4A4A";
const INK = "#F4EFD8";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

interface FilmClubCardProps {
  title: string;
  year?: number | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  rating?: number | null;
  reviewText?: string | null;
  username: string;
  displayName: string;
  onClose: () => void;
  onShare?: () => void;
}

export default function FilmClubCard({
  title,
  year,
  posterPath,
  backdropPath,
  rating,
  reviewText,
  username,
  displayName,
  onClose,
  onShare,
}: FilmClubCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (cardRef.current && navigator.share) {
      // Try native share API for mobile
      try {
        // Use html2canvas approach later — for MVP, share text
        await navigator.share({
          title: `${title} — Film Club`,
          text: `${displayName} rated ${title}${rating ? ` ${rating.toFixed(1)}/10` : ""}${reviewText ? ` — "${reviewText.slice(0, 100)}"` : ""}\n\nJoin Film Club`,
          url: window.location.origin,
        });
      } catch {
        // Fallback: copy to clipboard
        const text = `${displayName} rated ${title}${rating ? ` ${rating.toFixed(1)}/10` : ""}${reviewText ? `\n"${reviewText.slice(0, 200)}"` : ""}\n\nFilm Club`;
        await navigator.clipboard?.writeText(text);
        alert("Copied to clipboard!");
      }
    } else {
      // Desktop fallback
      const text = `${displayName} rated ${title}${rating ? ` ${rating.toFixed(1)}/10` : ""}${reviewText ? `\n"${reviewText.slice(0, 200)}"` : ""}\n\nFilm Club`;
      try {
        await navigator.clipboard?.writeText(text);
        alert("Copied to clipboard!");
      } catch {
        // silent fail
      }
    }
    onShare?.();
  };

  const truncatedReview = reviewText && reviewText.length > 140
    ? reviewText.slice(0, 140) + "..."
    : reviewText;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-[380px]">
        {/* THE CARD */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl border border-white/[0.1]"
          style={{ backgroundColor: "#0E0D18" }}
        >
          {/* Backdrop image */}
          {backdropPath && (
            <div className="relative h-[180px] w-full">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${TMDB_IMG}${backdropPath})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                }}
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,13,24,0.2) 0%, rgba(14,13,24,0.95) 85%, rgba(14,13,24,1) 100%)" }} />
            </div>
          )}

          {!backdropPath && (
            <div className="h-[60px]" style={{ background: `linear-gradient(135deg, ${RED}22, #9C7BFF22)` }} />
          )}

          <div className={`px-5 ${backdropPath ? "-mt-16 relative z-10" : "pt-4"} pb-5`}>
            {/* Poster + Title row */}
            <div className="flex gap-4 mb-4">
              {posterPath && (
                <div
                  className="h-[130px] w-[87px] shrink-0 overflow-hidden rounded-xl border border-white/[0.15] shadow-2xl"
                  style={{
                    backgroundImage: `url(${TMDB_IMG}${posterPath})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              <div className="flex-1 flex flex-col justify-end">
                <h2 className="font-anton text-[22px] leading-[1.05] tracking-[0.02em] text-[#F4EFD8]">
                  {title}
                </h2>
                {year && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/50">
                    {year}
                  </p>
                )}
              </div>
            </div>

            {/* Rating */}
            {rating != null && rating > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <span className="font-anton text-[36px] leading-none text-fc-red">
                  {rating.toFixed(1)}
                </span>
                <div className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: `${INK}0A` }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(rating / 10) * 100}%`,
                        background: `linear-gradient(90deg, ${RED}88, ${RED})`,
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/30">
                    out of 10
                  </p>
                </div>
              </div>
            )}

            {/* Review excerpt */}
            {truncatedReview && (
              <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="font-sans text-[12px] leading-[1.5] text-[#F4EFD8]/70 italic">
                  "{truncatedReview}"
                </p>
              </div>
            )}

            {/* User info + branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full font-anton text-[10px]"
                  style={{ background: `linear-gradient(135deg, ${RED}, #9C7BFF)`, color: BG }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-anton text-[11px] tracking-[0.02em] text-[#F4EFD8]">
                    {displayName}
                  </p>
                  <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#F4EFD8]/35">
                    @{username}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-fc-red/20 ring-1 ring-fc-red/40">
                  <span className="font-anton text-[7px] text-fc-red">FC</span>
                </div>
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                  FILM CLUB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/60 transition hover:text-[#F4EFD8]"
          >
            DONE
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fc-red py-3.5 font-anton text-[12px] tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(255,74,74,0.4)] transition active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            SHARE
          </button>
        </div>
      </div>
    </div>
  );
}
