"use client";

/* ============================================================
   CLUBS — CREATE
   Linked from /clubs "+ CREATE". Creates row + owner membership.
   ============================================================ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { createUserClub } from "../../lib/hooks";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const MUTED = "#8B88A6";

export default function CreateClubPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmitting(true);
    const result = await createUserClub(user.id, { name, tagline, category });
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.replace(`/clubs/${result.clubId}`);
  }

  if (loading || !user) {
    return <div className="min-h-screen" style={{ backgroundColor: BG }} />;
  }

  return (
    <div className="min-h-screen px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]" style={{ backgroundColor: BG, color: INK }}>
      <div className="mx-auto max-w-[480px]">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/clubs"
            className="font-mono text-[9px] uppercase tracking-[0.2em] text-fc-red/80 transition hover:text-fc-red"
          >
            ← Back to clubs
          </Link>
        </header>

        <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-muted">FILM CLUB</p>
        <h1 className="mt-2 font-anton text-[28px] tracking-[0.04em] text-[#F4EFD8]">START A CLUB</h1>
        <p className="mt-2 font-sans text-sm italic text-[#F4EFD8]/50">Name it. Set the vibe. You&apos;re the first member.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-white/[0.08] p-5" style={{ backgroundColor: SURFACE }}>
          <div>
            <label htmlFor="club-name" className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/45">
              Club name
            </label>
            <input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Midnight Arthouse"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#0E0D18] px-4 py-3 font-sans text-sm text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="club-tagline" className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/45">
              Tagline
            </label>
            <input
              id="club-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={160}
              placeholder="One line — what unites this room?"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#0E0D18] px-4 py-3 font-sans text-sm text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="club-category" className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/45">
              Category (optional)
            </label>
            <input
              id="club-category"
              value={category}
              onChange={(e) => setCategory(e.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, ""))}
              maxLength={24}
              placeholder="GENERAL"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#0E0D18] px-4 py-3 font-mono text-xs text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
            />
          </div>

          {error ? (
            <p className="font-mono text-[11px] text-fc-red" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full rounded-xl bg-fc-red py-3.5 font-anton text-sm tracking-[0.12em] text-white shadow-[0_6px_18px_rgba(255,74,74,0.35)] transition hover:shadow-[0_8px_22px_rgba(255,74,74,0.45)] disabled:opacity-50"
          >
            {submitting ? "CREATING…" : "CREATE CLUB"}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[9px] tracking-wider" style={{ color: MUTED }}>
          You&apos;ll land in the club room as soon as it exists.
        </p>
      </div>
    </div>
  );
}
