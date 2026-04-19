"use client";

/* ============================================================
   FILM CLUB — Invite Unlock Card
   Appears once a user has 3+ interactions.
   "You earned an invite. Bring one person."
   ============================================================ */

import { useState } from "react";
import { useInviteEligibility } from "../lib/hooks";

interface Props {
  userId: string | undefined;
}

export default function InviteUnlockCard({ userId }: Props) {
  const { eligible, code, generateCode, loading } = useInviteEligibility(userId);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !eligible) return null;

  const inviteUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : "https://filmclub.app"}/onboarding?invite=${code.code}`
    : null;

  const handleGenerate = async () => {
    setGenerating(true);
    await generateCode();
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  };

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-fc-red/40"
      style={{ background: "linear-gradient(135deg, #2A1A1A 0%, #1A1929 70%)" }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-fc-red">
              / INVITE UNLOCKED
            </span>
            <h3 className="mt-1.5 font-anton text-[22px] leading-[1.05] tracking-[0.01em] text-white">
              YOU EARNED AN INVITE.
            </h3>
            <p className="mt-2 font-sans text-[12px] leading-[1.4] text-white/60">
              Bring one person. The club works best small.
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

        {!code ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-3 w-full rounded-full bg-fc-red px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#0E0D18] transition active:scale-[0.98] disabled:opacity-60"
          >
            {generating ? "GENERATING…" : "GENERATE MY INVITE"}
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">
                YOUR INVITE CODE
              </p>
              <p className="mt-1 font-anton text-[18px] tracking-[0.18em] text-fc-red">
                {code.code}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full rounded-full border border-fc-red bg-fc-red/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fc-red transition hover:bg-fc-red/20"
            >
              {copied ? "COPIED ✓" : "COPY INVITE LINK"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
