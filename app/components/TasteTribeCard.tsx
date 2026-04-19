"use client";

/* ============================================================
   FILM CLUB — Taste Tribe Card
   First-session identity card. Self-assigns from first ratings,
   persists to profiles.taste_tribe.
   "You came to discover films, you leave with an identity."
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useUserLogs, assignTasteTribe, TASTE_TRIBES } from "../lib/hooks";
import type { Profile } from "../lib/supabase";

interface Props {
  userId: string | undefined;
  profile: Profile | null;
}

export default function TasteTribeCard({ userId, profile }: Props) {
  const { logs } = useUserLogs(userId);
  const [savedTribe, setSavedTribe] = useState<string | null>(profile?.taste_tribe ?? null);
  const [dismissed, setDismissed] = useState(false);

  // Compute tribe from rated logs (first 5+)
  const tribe = useMemo(() => {
    const rated = logs
      .filter((l) => typeof l.rating === "number")
      .map((l) => ({ rating: l.rating ?? 0, year: undefined, runtime: undefined, genres: [] }));
    return assignTasteTribe(rated);
  }, [logs]);

  // Persist on first compute if user doesn't have one yet
  useEffect(() => {
    if (!userId) return;
    if (savedTribe) return;
    if (logs.length < 3) return; // need a few signals
    (async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ taste_tribe: tribe.key })
        .eq("id", userId);
      if (!error) setSavedTribe(tribe.key);
    })();
  }, [userId, savedTribe, logs.length, tribe.key]);

  // Hide if no tribe yet (not enough signal) or user dismissed
  if (dismissed) return null;
  const showTribe = savedTribe ?? tribe.key;
  const tribeData = TASTE_TRIBES.find((t) => t.key === showTribe) ?? tribe;
  if (logs.length < 3 && !savedTribe) return null;

  const handleShare = async () => {
    const text = `I'm ${tribeData.label} on Film Club. ${tribeData.hint}`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ text, title: "Film Club" });
      } catch {
        /* user cancelled */
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-white/[0.08]"
      style={{
        background:
          "linear-gradient(135deg, #2A1A3F 0%, #1A1929 50%, #2A1F1F 100%)",
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-fc-red/80">
              / YOUR TASTE TRIBE
            </span>
            <h3 className="mt-1.5 font-anton text-[26px] leading-[1] tracking-[0.02em] text-white">
              {tribeData.label}
            </h3>
            <p className="mt-2 font-sans text-[12px] leading-[1.4] italic text-white/55">
              {tribeData.hint}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="font-mono text-[14px] text-white/30 hover:text-white/60"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 rounded-full bg-fc-red px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#0E0D18] transition active:scale-[0.98]"
          >
            SHARE YOUR TRIBE
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full border border-white/[0.12] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60"
          >
            LATER
          </button>
        </div>
      </div>
    </section>
  );
}
