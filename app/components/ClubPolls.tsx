"use client";

/* ============================================================
   CLUB POLLS — quick multi-choice polls
   Members create polls (2-4 options), others vote with 1 tap.
   Results visible after voting.
   ============================================================ */

import { useState, useCallback } from "react";
import { useClubPolls } from "../lib/hooks";

const SURFACE = "#17162A";

interface Props {
  clubId: string;
  userId: string | undefined;
  canPost: boolean;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ClubPolls({ clubId, userId, canPost }: Props) {
  const { polls, loading, createPoll, vote } = useClubPolls(clubId, userId);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = useCallback(async () => {
    setError("");
    if (!question.trim()) { setError("Add a question."); return; }
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (cleaned.length < 2) { setError("Need at least 2 options."); return; }
    setSubmitting(true);
    const { error: err } = await createPoll(question, cleaned);
    setSubmitting(false);
    if (err) { setError(typeof err === "string" ? err : "Couldn't create poll."); return; }
    setQuestion("");
    setOptions(["", ""]);
    setCreating(false);
  }, [question, options, createPoll]);

  const updateOption = (i: number, val: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  };

  const addOption = () => {
    if (options.length < 4) setOptions((prev) => [...prev, ""]);
  };

  if (loading && polls.length === 0) {
    return null; // hide while loading first time
  }

  return (
    <div className="mb-4">
      {/* Header + create button */}
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#F4EFD8]/40">
          POLLS {polls.length > 0 && `(${polls.length})`}
        </p>
        {canPost && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full border border-fc-red/40 bg-fc-red/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-fc-red/90 hover:bg-fc-red/20 transition"
          >
            + NEW POLL
          </button>
        )}
      </div>

      {/* Create poll form */}
      {creating && (
        <div className="mb-3 rounded-2xl border border-white/[0.08] p-3" style={{ backgroundColor: SURFACE }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-fc-red/80">NEW POLL</p>
            <button
              type="button"
              onClick={() => { setCreating(false); setError(""); setQuestion(""); setOptions(["", ""]); }}
              className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40 hover:text-[#F4EFD8]/70"
            >
              CANCEL
            </button>
          </div>
          <input
            type="text"
            placeholder="ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={120}
            className="mb-2 w-full rounded-lg px-3 py-2 font-sans text-[13px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none focus:ring-1 focus:ring-fc-red/40"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
          />
          {options.map((o, i) => (
            <input
              key={i}
              type="text"
              placeholder={`option ${i + 1}`}
              value={o}
              onChange={(e) => updateOption(i, e.target.value)}
              maxLength={60}
              className="mb-2 w-full rounded-lg px-3 py-2 font-sans text-[12px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none focus:ring-1 focus:ring-fc-red/40"
              style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
            />
          ))}
          {options.length < 4 && (
            <button
              type="button"
              onClick={addOption}
              className="mb-2 w-full rounded-lg border border-dashed border-white/15 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40 hover:border-white/30 hover:text-[#F4EFD8]/70 transition"
            >
              + ADD OPTION
            </button>
          )}
          {error && (
            <p className="mb-2 font-mono text-[10px] text-fc-red">{error}</p>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={handleCreate}
            className="w-full rounded-full bg-fc-red py-2 font-anton text-[11px] tracking-[0.12em] text-white transition hover:scale-[1.01] disabled:opacity-50"
          >
            {submitting ? "POSTING…" : "POST POLL"}
          </button>
        </div>
      )}

      {/* Polls list */}
      <div className="space-y-2">
        {polls.map((p) => (
          <PollCard key={p.id} poll={p} canVote={canPost} onVote={(idx) => vote(p.id, idx)} />
        ))}
      </div>
    </div>
  );
}

function PollCard({
  poll,
  canVote,
  onVote,
}: {
  poll: any;
  canVote: boolean;
  onVote: (idx: number) => void;
}) {
  const total = poll.total_votes || 0;
  const userVote: number | null = poll.user_vote;
  const hasVoted = userVote !== null;
  const closed = poll.closes_at && new Date(poll.closes_at).getTime() < Date.now();
  const authorName = poll.profiles?.display_name || poll.profiles?.username || "Someone";

  return (
    <div className="rounded-2xl border border-white/[0.08] p-3" style={{ backgroundColor: SURFACE }}>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fc-red/20 font-anton text-[10px] text-fc-red">
          {authorName.charAt(0).toUpperCase()}
        </div>
        <p className="font-sans text-[11px] text-[#F4EFD8]/60">{authorName}</p>
        <span className="font-mono text-[8px] text-[#F4EFD8]/25">·</span>
        <p className="font-mono text-[8px] text-[#F4EFD8]/25">{getTimeAgo(poll.created_at)}</p>
        {closed && (
          <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[#F4EFD8]/30">
            CLOSED
          </span>
        )}
      </div>

      {/* Question */}
      <p className="mb-2 font-anton text-[15px] leading-tight tracking-wide text-[#F4EFD8]">
        {poll.question}
      </p>

      {/* Options */}
      <div className="space-y-1.5">
        {poll.options.map((opt: string, idx: number) => {
          const count = poll.vote_counts?.[idx] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMyVote = userVote === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={!canVote || closed}
              onClick={() => onVote(idx)}
              className={`relative w-full overflow-hidden rounded-lg border p-2.5 text-left transition disabled:cursor-default ${
                isMyVote
                  ? "border-fc-red/60 bg-fc-red/10"
                  : hasVoted || closed
                  ? "border-white/[0.05] bg-black/20"
                  : "border-white/10 bg-black/20 hover:border-fc-red/40"
              }`}
            >
              {/* Bar fill (only show after voting or when closed) */}
              {(hasVoted || closed) && (
                <div
                  className={`absolute inset-0 transition-all ${isMyVote ? "bg-fc-red/[0.12]" : "bg-white/[0.03]"}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              )}
              <div className="relative flex items-center gap-2">
                <span className={`flex-1 font-sans text-[12px] ${isMyVote ? "text-fc-red" : "text-[#F4EFD8]/85"}`}>
                  {opt}
                </span>
                {(hasVoted || closed) && (
                  <span className={`font-anton text-[12px] ${isMyVote ? "text-fc-red" : "text-[#F4EFD8]/40"}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/30">
        {total} {total === 1 ? "vote" : "votes"}
        {!hasVoted && !closed && canVote && " · tap to vote"}
      </p>
    </div>
  );
}
