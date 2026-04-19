"use client";

/* ============================================================
   FILM CLUB — NOTIFICATIONS (full page)
   ============================================================ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

const BG = "#0E0D18";
const INK = "#F4EFD8";

interface Notification {
  id: string;
  type: "club_post" | "new_member" | "film_logged" | "welcome" | "system";
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const notifs: Notification[] = [];

      // Pull club posts by others
      const { data: posts } = await supabase
        .from("club_posts")
        .select("id, body, created_at, profiles(display_name, username), clubs(name)")
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      (posts ?? []).forEach((p: any) => {
        const who = p.profiles?.display_name || p.profiles?.username || "Someone";
        const club = p.clubs?.name || "a club";
        notifs.push({
          id: `post-${p.id}`,
          type: "club_post",
          title: `${who} posted in ${club}`,
          body: (p.body || "shared a film log").slice(0, 120),
          link: null,
          read: false,
          created_at: p.created_at,
        });
      });

      // Own logs
      const { data: logs } = await supabase
        .from("film_logs")
        .select("id, title, rating, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      (logs ?? []).forEach((l: any) => {
        notifs.push({
          id: `log-${l.id}`,
          type: "film_logged",
          title: `You logged ${l.title}`,
          body: l.rating ? `Rated ${l.rating.toFixed(1)}/10` : "Added to your diary",
          link: `/log/${l.id}`,
          read: true,
          created_at: l.created_at,
        });
      });

      // Welcome
      notifs.push({
        id: "welcome",
        type: "welcome",
        title: "Welcome to Film Club",
        body: "Your Film Club ID is ready. Start logging films and join clubs to unlock your taste profile.",
        link: "/profile",
        read: true,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      });

      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notifs);
      setLoading(false);
    })();
  }, [user?.id]);

  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  if (authLoading || loading) {
    return <div className="min-h-screen" style={{ backgroundColor: BG }} />;
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: BG, color: INK }}>
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative z-10 mx-auto min-h-screen max-w-[480px]">
        <header
          className="sticky top-0 z-30 border-b border-white/[0.05] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl"
          style={{ backgroundColor: `${BG}E6` }}
        >
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => router.back()} className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline mr-1"><path d="M15 18l-6-6 6-6" /></svg>
              BACK
            </button>
          </div>
          <h1 className="font-anton text-[24px] leading-[1] tracking-[0.04em] text-[#F4EFD8]">
            NOTIFICATIONS
          </h1>
          <div className="mt-3 flex gap-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] transition ${
                  filter === f ? "bg-fc-red text-white" : "bg-white/[0.04] text-[#F4EFD8]/45"
                }`}
              >
                {f === "unread" ? `UNREAD (${notifications.filter((n) => !n.read).length})` : "ALL"}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pb-12 pt-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center mt-4">
              <p className="font-anton text-[16px] text-[#F4EFD8]">ALL CAUGHT UP</p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                No {filter === "unread" ? "unread " : ""}notifications
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {filtered.map((n) => {
                const icon = n.type === "club_post" ? "💬" : n.type === "film_logged" ? "🎬" : n.type === "welcome" ? "🎟" : "📢";
                const inner = (
                  <div className={`flex gap-3 rounded-xl border border-white/[0.06] p-3.5 transition hover:border-white/[0.12] ${!n.read ? "bg-fc-red/[0.04] border-fc-red/20" : "bg-white/[0.02]"}`}>
                    <span className="mt-0.5 text-[16px]">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[12px] font-medium leading-tight text-[#F4EFD8]/90">
                        {n.title}
                      </p>
                      <p className="mt-1 font-sans text-[11px] leading-[1.4] text-[#F4EFD8]/50">
                        {n.body}
                      </p>
                      <p className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-[#F4EFD8]/30">
                        {getTimeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-fc-red" />}
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link}>{inner}</Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
