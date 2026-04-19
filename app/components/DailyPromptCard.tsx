"use client";

/* ============================================================
   FILM CLUB — Daily Prompt Card
   The single highest-activation mechanic. One question a day.
   Tap-to-answer. After answering, see what the club said.
   ============================================================ */

import { useState } from "react";
import { useDailyPrompt } from "../lib/hooks";

const RED = "#FF4A4A";
const SURFACE = "#252436";

interface Props {
  userId: string | undefined;
}

export default function DailyPromptCard({ userId }: Props) {
  const { prompt, answered, answers, loading, submit } = useDailyPrompt(userId);
  const [draft, setDraft] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading || !prompt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    await submit(draft);
    setDraft("");
    setSubmitting(false);
    setShowAnswers(true);
  };

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-fc-red/30"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,74,74,0.12) 0%, rgba(28,27,42,0.9) 60%, rgba(28,27,42,0.95) 100%)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-fc-red/80">
            / TODAY&apos;S QUESTION
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">
            {answers.length} {answers.length === 1 ? "ANSWER" : "ANSWERS"}
          </span>
        </div>

        <h3 className="mt-2 font-anton text-[20px] leading-[1.15] tracking-[0.01em] text-white">
          {prompt.question.toUpperCase()}
        </h3>

        {!answered ? (
          <form onSubmit={handleSubmit} className="mt-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus={false}
              maxLength={140}
              placeholder="One sentence. No notes."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-sans text-[14px] text-white placeholder:text-white/30 focus:border-fc-red/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || submitting}
              className="mt-2 w-full rounded-full bg-fc-red px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#0E0D18] transition active:scale-[0.98] disabled:bg-white/[0.08] disabled:text-white/30"
            >
              {submitting ? "POSTING…" : "DROP YOUR TAKE"}
            </button>
          </form>
        ) : (
          <div className="mt-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fc-red/80">
              ✓ YOU&apos;RE IN
            </p>
            <button
              type="button"
              onClick={() => setShowAnswers((s) => !s)}
              className="mt-2 w-full rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 transition hover:border-white/[0.24] hover:text-white"
            >
              {showAnswers ? "HIDE THE CLUB'S ANSWERS" : `SEE WHAT THE CLUB SAID (${answers.length})`}
            </button>
          </div>
        )}

        {showAnswers && answers.length > 0 && (
          <ul className="mt-3 space-y-2">
            {answers.slice(0, 8).map((a) => {
              const name = a.profiles?.display_name || a.profiles?.username || "member";
              const initial = name.charAt(0).toUpperCase();
              return (
                <li
                  key={a.id}
                  className="flex gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fc-red/20 font-anton text-[10px] text-fc-red">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/40">
                      {name}
                    </p>
                    <p className="mt-0.5 font-sans text-[13px] leading-[1.35] text-white/85">
                      {a.answer}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
