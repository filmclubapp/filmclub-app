"use client";

/* ============================================================
   ADMIN — Daily Prompt Manager
   /admin/prompts
   - View all upcoming + past prompts
   - Add new prompt for a specific date
   - Mark a prompt active / delete it
   - Quick-seed the next 14 days from presets

   Access: only show to admin users (email check client-side).
   For MVP this is good enough. Add RLS on the table for real auth.
   ============================================================ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

const BG = "#1E1D2B";
const SURFACE = "#252436";
const BORDER = "rgba(255,255,255,0.07)";

// ── Admin gate (swap in your email) ──────────────────────────
const ADMIN_EMAILS = ["sam.sandle98706@gmail.com"];

// ── 14 preset prompts ────────────────────────────────────────
const PRESET_PROMPTS = [
  "What film do you quote constantly but have never rewatched?",
  "A movie everyone loves that you think is massively overrated.",
  "The last film that genuinely surprised you. What did you expect?",
  "A director's worst film — and why you still watched it.",
  "Pick a film to describe your current mood. Just the title.",
  "What's the most underrated performance you've ever seen?",
  "A film you watched alone that you wish you'd seen with someone.",
  "The movie that made you cry when you absolutely did not expect to.",
  "If you had to show one film to someone who hates cinema, what is it?",
  "A sequel that's genuinely better than the original. Defend it.",
  "What film do you think aged the worst? Why?",
  "The film you've recommended the most — and has anyone actually watched it?",
  "A movie that changed how you see a real place, person, or time in history.",
  "Last film you rated 5 stars. Would you rate it the same today?",
];

interface Prompt {
  id: string;
  prompt_date: string;
  question: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function addDays(base: string, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export default function AdminPromptsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState(todayISO());
  const [newQuestion, setNewQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Auth gate ────────────────────────────────────────────────
  useEffect(() => {
    if (user === null) router.replace("/auth");
    else if (user && !ADMIN_EMAILS.includes(user.email ?? "")) {
      router.replace("/home");
    }
  }, [user, router]);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? "");

  // ── Load prompts ─────────────────────────────────────────────
  const loadPrompts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_prompts")
      .select("*")
      .order("prompt_date", { ascending: false })
      .limit(60);
    setPrompts((data as Prompt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadPrompts();
  }, [isAdmin]);

  // ── Flash message helper ─────────────────────────────────────
  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  // ── Add single prompt ────────────────────────────────────────
  const addPrompt = async () => {
    if (!newQuestion.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("daily_prompts").upsert(
      { prompt_date: newDate, question: newQuestion.trim() },
      { onConflict: "prompt_date" }
    );
    if (error) flash(error.message, false);
    else {
      flash("Prompt saved ✓");
      setNewQuestion("");
      setNewDate(addDays(newDate, 1));
      await loadPrompts();
    }
    setSaving(false);
  };

  // ── Seed 14 presets from tomorrow ───────────────────────────
  const seedPresets = async () => {
    setSeeding(true);
    const today = todayISO();
    const rows = PRESET_PROMPTS.map((q, i) => ({
      prompt_date: addDays(today, i + 1),
      question: q,
    }));
    const { error } = await supabase
      .from("daily_prompts")
      .upsert(rows, { onConflict: "prompt_date" });
    if (error) flash(error.message, false);
    else {
      flash(`Seeded ${rows.length} prompts ✓`);
      await loadPrompts();
    }
    setSeeding(false);
  };

  // ── Delete prompt ────────────────────────────────────────────
  const deletePrompt = async (id: string) => {
    const { error } = await supabase.from("daily_prompts").delete().eq("id", id);
    if (error) flash(error.message, false);
    else {
      flash("Deleted");
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (!isAdmin) return null;

  const today = todayISO();
  const upcoming = prompts.filter((p) => p.prompt_date >= today);
  const past = prompts.filter((p) => p.prompt_date < today);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-[640px] px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-fc-red/70">Admin</p>
            <h1 className="font-anton text-[28px] tracking-[0.06em] text-white">DAILY PROMPTS</h1>
          </div>
          <button
            onClick={() => router.push("/home")}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30 hover:text-white/60"
          >
            ← Back
          </button>
        </div>

        {/* Flash message */}
        {msg && (
          <div
            className={`mb-5 rounded-xl px-4 py-3 font-mono text-[11px] tracking-wide ${
              msg.ok
                ? "border border-green-500/30 bg-green-500/10 text-green-300"
                : "border border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Add prompt form */}
        <section
          className="mb-6 rounded-2xl border p-5"
          style={{ backgroundColor: SURFACE, borderColor: BORDER }}
        >
          <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
            Add / Overwrite Prompt
          </p>
          <div className="mb-3">
            <label className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-white/30">
              Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 font-mono text-[13px] text-white outline-none focus:border-fc-red/40"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-white/30">
              Question
            </label>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="What film…"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 font-sans text-[13px] text-white placeholder-white/20 outline-none focus:border-fc-red/40"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={addPrompt}
              disabled={saving || !newQuestion.trim()}
              className="flex-1 rounded-xl bg-fc-red py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white transition hover:bg-fc-red/80 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Prompt"}
            </button>
            <button
              onClick={seedPresets}
              disabled={seeding}
              className="rounded-xl border border-white/[0.10] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50 transition hover:border-white/20 hover:text-white/70 disabled:opacity-40"
            >
              {seeding ? "Seeding…" : "Seed 14 Presets"}
            </button>
          </div>
        </section>

        {/* Preset picker */}
        <section
          className="mb-6 rounded-2xl border p-5"
          style={{ backgroundColor: SURFACE, borderColor: BORDER }}
        >
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
            Pick from Presets
          </p>
          <div className="flex flex-col gap-1.5">
            {PRESET_PROMPTS.map((q, i) => (
              <button
                key={i}
                onClick={() => setNewQuestion(q)}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left font-sans text-[12px] text-white/60 transition hover:border-fc-red/20 hover:bg-white/[0.04] hover:text-white/85"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* Upcoming prompts */}
        <section className="mb-6">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
            Upcoming ({upcoming.length})
          </p>
          {loading ? (
            <p className="py-6 text-center font-mono text-xs text-white/25">loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="rounded-xl border border-white/[0.06] py-6 text-center font-mono text-xs text-white/25">
              No upcoming prompts — seed some above.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((p) => (
                <PromptRow
                  key={p.id}
                  prompt={p}
                  isToday={p.prompt_date === today}
                  onDelete={() => deletePrompt(p.id)}
                  onEdit={() => {
                    setNewDate(p.prompt_date);
                    setNewQuestion(p.question);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past prompts (collapsible) */}
        {past.length > 0 && (
          <section>
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
              Past ({past.length})
            </p>
            <div className="flex flex-col gap-2 opacity-50">
              {past.slice(0, 10).map((p) => (
                <PromptRow
                  key={p.id}
                  prompt={p}
                  isToday={false}
                  onDelete={() => deletePrompt(p.id)}
                  onEdit={() => {
                    setNewDate(p.prompt_date);
                    setNewQuestion(p.question);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Single prompt row ───────────────────────────────────────── */
function PromptRow({
  prompt,
  isToday,
  onDelete,
  onEdit,
}: {
  prompt: Prompt;
  isToday: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3.5 ${
        isToday ? "border-fc-red/30 bg-fc-red/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">
            {formatDate(prompt.prompt_date)}
          </span>
          {isToday && (
            <span className="rounded-full bg-fc-red/20 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-fc-red">
              Today
            </span>
          )}
        </div>
        <p className="font-sans text-[13px] text-white/80 leading-snug">{prompt.question}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <button
          onClick={onEdit}
          className="rounded-lg border border-white/[0.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-white/40 transition hover:text-white/70"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg border border-red-500/20 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-red-400/50 transition hover:text-red-400"
        >
          Del
        </button>
      </div>
    </div>
  );
}
