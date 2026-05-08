"use client";

/* ============================================================
   FILM CLUB — Sunday FOTW Reveal Banner
   Appears on Sunday + Monday morning. Shows the winning film
   from the user's most-active club, with a "I've seen it" CTA
   that opens the discussion thread for that film.
   "Your weekly ritual — the thing that makes Film Club a
   meeting, not an app."
   ============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { posterURL } from "../lib/tmdb";
import { currentWeekStart } from "../lib/hooks";
import type { FilmOfWeekNomination } from "../lib/hooks";

interface Props {
  clubIds: string[];
}

export default function SundayRevealBanner({ clubIds }: Props) {
  const [reveal, setReveal] = useState<{
    nomination: FilmOfWeekNomination;
    clubId: string;
    clubName: string;
  } | null>(null);

  useEffect(() => {
    if (clubIds.length === 0) return;

    const day = new Date().getDay(); // 0 sun, 1 mon
    if (day !== 0 && day !== 1) return; // only show Sun + Mon

    (async () => {
      // Find the leading nomination this week across the user's clubs
      const weekStart = currentWeekStart();
      const lastWeekStart = new Date(new Date(weekStart).getTime() - 7 * 86400000)
        .toISOString().slice(0, 10);
      // On Sunday we reveal *this* week's leader; on Monday we show *last* week's winner
      const targetWeek = day === 0 ? weekStart : lastWeekStart;

      const { data: noms } = await supabase
        .from("club_film_of_week_nominations")
        .select("*, clubs(name)")
        .in("club_id", clubIds)
        .eq("week_start", targetWeek);

      if (!noms || noms.length === 0) return;

      const { data: votes } = await supabase
        .from("club_film_of_week_votes")
        .select("nomination_id")
        .in("club_id", clubIds)
        .eq("week_start", targetWeek);

      const counts = new Map<string, number>();
      for (const v of votes ?? []) {
        counts.set(v.nomination_id, (counts.get(v.nomination_id) ?? 0) + 1);
      }
      const sorted = (noms as any[])
        .map((n) => ({ ...n, vote_count: counts.get(n.id) ?? 0 }))
        .sort((a, b) => b.vote_count - a.vote_count);

      const winner = sorted[0];
      if (!winner || winner.vote_count === 0) return;
      setReveal({
        nomination: winner,
        clubId: winner.club_id,
        clubName: winner.clubs?.name ?? "your club",
      });
    })();
  }, [clubIds]);

  if (!reveal) return null;
  const { nomination, clubId, clubName } = reveal;
  const day = new Date().getDay();
  const headline = day === 0 ? "VOTING CLOSES TONIGHT" : "THIS WEEK'S WINNER";

  return (
    <Link
      href={`/clubs/${clubId}`}
      className="mb-5 block overflow-hidden rounded-2xl border border-fc-red/40"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,74,74,0.18) 0%, rgba(28,27,42,0.95) 60%)",
      }}
    >
      <div className="flex gap-4 p-4">
        <div className="relative h-[100px] w-[67px] shrink-0 overflow-hidden rounded-lg">
          <Image
            src={posterURL(nomination.poster_path, "w185")}
            alt={nomination.title}
            fill
            className="object-cover"
            sizes="67px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red">
            🎬 {headline}
          </p>
          <p className="mt-1.5 font-anton text-[18px] leading-tight tracking-wide text-white">
            {nomination.title.toUpperCase()}
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/40">
            CHOSEN BY {clubName.toUpperCase()}
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-fc-red">
            OPEN THE DISCUSSION →
          </p>
        </div>
      </div>
    </Link>
  );
}
