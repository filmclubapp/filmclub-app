"use client";

/* ============================================================
   NOTIFICATION BELL — Top-right bell icon with dropdown
   Shows last 3 notifications, links to full page.
   ============================================================ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

const RED = "#FF4A4A";
const BG = "#0E0D18";

export interface Notification {
  id: string;
  user_id: string;
  type: "club_post" | "new_member" | "film_logged" | "welcome" | "system" | "reaction" | "reply";
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

/* MVP: generate mock notifications from real activity */
function useMVPNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    (async () => {
      // Pull recent club posts as notification proxies
      const { data: posts } = await supabase
        .from("club_posts")
        .select("id, body, created_at, profiles(display_name, username), clubs(name)")
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Pull recent film logs as notifications
      const { data: logs } = await supabase
        .from("film_logs")
        .select("id, title, rating, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      const notifs: Notification[] = [];

      // Welcome notification always
      notifs.push({
        id: "welcome",
        user_id: userId,
        type: "welcome",
        title: "Welcome to Film Club",
        body: "Your Film Club ID is ready. Start logging films and join clubs.",
        link: "/profile",
        read: true,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      });

      // Club posts from others
      (posts ?? []).forEach((p: any) => {
        const who = p.profiles?.display_name || p.profiles?.username || "Someone";
        const club = p.clubs?.name || "a club";
        notifs.push({
          id: `post-${p.id}`,
          user_id: userId,
          type: "club_post",
          title: `${who} posted in ${club}`,
          body: (p.body || "shared a film log").slice(0, 80),
          link: null,
          read: false,
          created_at: p.created_at,
        });
      });

      // Own logs confirmation
      (logs ?? []).forEach((l: any) => {
        notifs.push({
          id: `log-${l.id}`,
          user_id: userId,
          type: "film_logged",
          title: `You logged ${l.title}`,
          body: l.rating ? `Rated ${l.rating.toFixed(1)}/10` : "Added to your diary",
          link: `/log/${l.id}`,
          read: true,
          created_at: l.created_at,
        });
      });

      // Pull reactions on user's posts
      const { data: myPosts } = await supabase
        .from("club_posts")
        .select("id")
        .eq("user_id", userId);

      if (myPosts && myPosts.length > 0) {
        const postIds = myPosts.map((p: any) => p.id);
        const { data: reactions } = await supabase
          .from("club_post_reactions")
          .select("id, emoji, created_at, post_id, profiles(display_name, username)")
          .in("post_id", postIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        (reactions ?? []).forEach((r: any) => {
          const who = r.profiles?.display_name || r.profiles?.username || "Someone";
          notifs.push({
            id: `reaction-${r.id}`,
            user_id: userId,
            type: "reaction",
            title: `${who} reacted ${r.emoji} to your post`,
            body: "Tap to see the conversation",
            link: null,
            read: false,
            created_at: r.created_at,
          });
        });

        // Pull replies on user's posts
        const { data: replies } = await supabase
          .from("club_post_replies")
          .select("id, body, created_at, post_id, profiles(display_name, username)")
          .in("post_id", postIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        (replies ?? []).forEach((r: any) => {
          const who = r.profiles?.display_name || r.profiles?.username || "Someone";
          notifs.push({
            id: `reply-${r.id}`,
            user_id: userId,
            type: "reply",
            title: `${who} replied to your post`,
            body: (r.body || "").slice(0, 80),
            link: null,
            read: false,
            created_at: r.created_at,
          });
        });
      }

      // Sort by date descending
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notifs);
      setLoading(false);
    })();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead } = useMVPNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const recent = notifications.slice(0, 3);

  return (
    <div ref={ref} className="relative">
      {/* BELL BUTTON */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] transition hover:bg-white/[0.08]"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4EFD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fc-red text-[8px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[300px] overflow-hidden rounded-2xl border border-white/[0.1] shadow-2xl"
          style={{ backgroundColor: "#17162A", zIndex: 100 }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <span className="font-anton text-[12px] tracking-[0.06em] text-[#F4EFD8]">
              NOTIFICATIONS
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="font-mono text-[7px] uppercase tracking-[0.14em] text-fc-red"
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="p-4 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                No notifications yet
              </p>
            </div>
          ) : (
            <div>
              {recent.map((n) => (
                <NotifItem key={n.id} notif={n} onClose={() => setOpen(false)} />
              ))}
            </div>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-white/[0.06] py-2.5 text-center font-mono text-[8px] uppercase tracking-[0.16em] text-fc-red transition hover:bg-white/[0.04]"
          >
            SEE ALL NOTIFICATIONS
          </Link>
        </div>
      )}
    </div>
  );
}

function NotifItem({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  const timeAgo = getTimeAgo(notif.created_at);
  const icon = notif.type === "reaction" ? "👍" : notif.type === "reply" ? "💬" : notif.type === "club_post" ? "📝" : notif.type === "film_logged" ? "🎬" : notif.type === "welcome" ? "🎟" : "📢";

  const inner = (
    <div className={`flex gap-3 px-4 py-3 transition hover:bg-white/[0.04] ${!notif.read ? "bg-fc-red/[0.04]" : ""}`}>
      <span className="mt-0.5 text-[14px]">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[11px] font-medium leading-tight text-[#F4EFD8]/90">
          {notif.title}
        </p>
        <p className="mt-0.5 font-sans text-[10px] leading-tight text-[#F4EFD8]/45 line-clamp-1">
          {notif.body}
        </p>
        <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-[#F4EFD8]/30">
          {timeAgo}
        </p>
      </div>
      {!notif.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fc-red" />
      )}
    </div>
  );

  if (notif.link) {
    return (
      <Link href={notif.link} onClick={onClose}>
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
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
