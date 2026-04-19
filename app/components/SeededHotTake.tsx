"use client";

/* ============================================================
   FILM CLUB — Seeded Hot Take (pinned)
   A contrarian one-liner pinned at the top of every club.
   Tap a stance pill → pre-fills the composer with a starter
   AND auto-focuses it. "You are not asking them to write —
   you are asking them to take a side."
   ============================================================ */

interface Props {
  clubName: string;
  onPickStance: (starter: string) => void;
}

/* One hot take per club, hand-curated. Falls back to a generic
   contrarian if the club isn't in the map. */
const HOT_TAKES: Record<string, { author: string; text: string }> = {
  "A24 Lovers":      { author: "ROHAN, FOUNDER",   text: "Everything Everywhere is overrated — emotionally manipulative, formally incoherent. Change my mind." },
  "Rom-Com Obsessed":{ author: "MAYA, FOUNDER",    text: "When Harry Met Sally is the only rom-com that ages well. Everything since is a tribute act." },
  "Nolan Heads":     { author: "SAM, FOUNDER",     text: "Tenet is Nolan's best film. We just weren't ready for it." },
  "90s Cinema":      { author: "JAY, FOUNDER",     text: "The 90s peaked in 1999. Nothing in the decade touches Magnolia, Fight Club, or Eyes Wide Shut." },
  "Horror Heads":    { author: "ELI, FOUNDER",     text: "A24 horror killed horror. Hereditary is fine. The Conjuring 2 is the best horror film of the 2010s." },
  "Indie Darlings":  { author: "ZARA, FOUNDER",    text: "Past Lives is an A24 perfume ad with a script. Drive My Car earned every minute." },
};

const FALLBACK = {
  author: "FILM CLUB",
  text: "Most rewatched film ≠ favourite film. Argue with the wall.",
};

export default function SeededHotTake({ clubName, onPickStance }: Props) {
  const take = HOT_TAKES[clubName] ?? FALLBACK;

  const stances: { label: string; starter: string }[] = [
    { label: "AGREE",    starter: "Agree. " },
    { label: "DISAGREE", starter: "Hard disagree. " },
    { label: "DEPENDS",  starter: "Depends. " },
  ];

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-fc-red/30 bg-gradient-to-br from-fc-red/[0.08] via-transparent to-transparent">
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-fc-red">
            📌 PINNED HOT TAKE
          </span>
          <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-white/30">
            {take.author}
          </span>
        </div>
        <p className="font-anton text-[15px] leading-[1.25] tracking-[0.01em] text-white/95">
          &ldquo;{take.text}&rdquo;
        </p>
        <div className="mt-3 flex gap-2">
          {stances.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onPickStance(s.starter)}
              className="flex-1 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/70 transition hover:border-fc-red/40 hover:text-fc-red active:scale-95"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
