"use client";

/* ============================================================
   FILM CLUB — CLUB DETAIL
   The social layer. This is where the magic happens.
   Posts, stills, conversations, shared logs.
   ============================================================ */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth-context";
import {
  createClubPost,
  createPostReply,
  togglePostReaction,
  getPostReactions,
  REACTION_TYPES,
  REACTION_LABELS,
  type ReactionType,
  useClubFeed,
  useClubMembership,
  useClubMembers,
  useClubs,
} from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import FilmOfTheWeek from "../../components/FilmOfTheWeek";
import ClubPolls from "../../components/ClubPolls";
import SeededHotTake from "../../components/SeededHotTake";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const RED = "#FF4A4A";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_WIDE = "https://image.tmdb.org/t/p/w780";

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { clubs } = useClubs();
  const { posts, loading: feedLoading, refresh } = useClubFeed(id);
  const { join, leave, isMember } = useClubMembership(user?.id);
  const members = useClubMembers(id);
  const [joined, setJoined] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingToHotTake, setReplyingToHotTake] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "rankings" | "members" | "about">("feed");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => setJoined(await isMember(id)))();
  }, [user?.id, id, isMember]);

  // Auto-focus composer on first visit per club per session.
  // "The text box is auto-focused. Friction = zero."
  useEffect(() => {
    if (!joined || typeof window === "undefined") return;
    const key = `fc-club-focused-${id}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
      sessionStorage.setItem(key, "1");
    }, 600);
    return () => clearTimeout(t);
  }, [joined, id]);

  const club = useMemo(() => clubs.find((c: any) => c.id === id), [clubs, id]) as any;
  const canPost = joined && !!user?.id;

  const handleJoinLeave = async () => {
    if (!user?.id) return router.push("/auth");
    if (joined) {
      await leave(id);
      setJoined(false);
    } else {
      await join(id);
      setJoined(true);
    }
  };

  const handleSend = useCallback(async () => {
    if (!user?.id || !canPost || !text.trim()) return;
    setSending(true);
    const { error } = await createClubPost({
      club_id: id,
      user_id: user.id,
      body: text.trim(),
    });
    if (!error) {
      setText("");
      // Refresh feed to show the new post
      await refresh();
    } else {
      console.error("Post error:", error);
    }
    setSending(false);
  }, [user?.id, canPost, text, id, refresh]);

  // Auto-refresh feed on mount and after posting
  useEffect(() => {
    if (!feedLoading) {
      const interval = setInterval(() => refresh(), 15000); // refresh every 15s
      return () => clearInterval(interval);
    }
  }, [feedLoading, refresh]);

  if (!club) return <div className="min-h-screen" style={{ backgroundColor: BG }} />;

  // Collect unique film stills from posts that have log data
  const filmStills = posts
    .filter((p: any) => p.film_logs?.backdrop_path || p.film_logs?.poster_path)
    .slice(0, 6)
    .map((p: any) => ({
      path: p.film_logs.backdrop_path || p.film_logs.poster_path,
      title: p.film_logs.title,
    }));

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: BG, color: INK }}>
      {/* grain */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative z-10 mx-auto min-h-screen max-w-[480px]">
        {/* HERO BANNER */}
        <div className="relative h-[200px] w-full">
          <div className="absolute inset-0" style={{ background: club.accent_gradient || "linear-gradient(135deg, #FF4A4A, #1A1929)" }} />
          {club.cover_tmdb_backdrop && (
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage: `url(${TMDB_WIDE}${club.cover_tmdb_backdrop})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }}
            />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,13,24,0.3) 0%, rgba(14,13,24,0.95) 100%)" }} />

          {/* Back button */}
          <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-20">
            <Link
              href="/clubs"
              className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.1] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/70 transition hover:text-[#F4EFD8]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              CLUBS
            </Link>
          </div>

          {/* Club info overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/[0.1] px-2.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/70">
              {club.category || "GENERAL"}
            </span>
            <h1 className="mt-2 font-anton text-[28px] leading-none tracking-[0.02em] text-[#F4EFD8] drop-shadow-lg">
              {club.name}
            </h1>
            <p className="mt-1 font-sans text-[12px] italic text-[#F4EFD8]/60">{club.tagline}</p>
            <div className="mt-2 flex items-center gap-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/50">
                {(club.member_count ?? members.length).toLocaleString()} members
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/50">
                {posts.length} posts
              </span>
            </div>
          </div>
        </div>

        {/* JOIN/LEAVE BAR */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <button
            type="button"
            onClick={handleJoinLeave}
            className={`flex-1 rounded-xl py-2.5 font-anton text-[11px] tracking-[0.12em] transition active:scale-[0.98] ${
              joined
                ? "border border-white/[0.12] bg-white/[0.04] text-[#F4EFD8]/70 hover:border-fc-red/40 hover:text-fc-red"
                : "bg-fc-red text-white shadow-[0_6px_18px_rgba(255,74,74,0.35)]"
            }`}
          >
            {joined ? "LEAVE CLUB" : "JOIN CLUB"}
          </button>
          <Link
            href="/log"
            className="rounded-xl border border-fc-red/30 bg-fc-red/10 px-4 py-2.5 font-anton text-[11px] tracking-[0.12em] text-fc-red transition hover:bg-fc-red/20"
          >
            LOG FILM
          </Link>
        </div>

        {/* FILM STILLS CAROUSEL (from shared logs) */}
        {filmStills.length > 0 && (
          <div className="border-b border-white/[0.06] py-3">
            <div className={`flex gap-2 overflow-x-auto px-4 ${SCROLL_HIDE}`}>
              {filmStills.map((still: any, i: number) => (
                <div
                  key={i}
                  className="relative h-[60px] w-[107px] shrink-0 overflow-hidden rounded-lg"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${TMDB_IMG}${still.path})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <p className="absolute bottom-1 left-1.5 right-1 truncate font-mono text-[6px] uppercase tracking-[0.1em] text-[#F4EFD8]/70">
                    {still.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB BAR */}
        <div className="flex border-b border-white/[0.06] px-4">
          {(["feed", "rankings", "members", "about"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 font-mono text-[9px] uppercase tracking-[0.16em] transition ${
                activeTab === tab
                  ? "border-b-2 border-fc-red text-fc-red"
                  : "border-b-2 border-transparent text-[#F4EFD8]/40 hover:text-[#F4EFD8]/70"
              }`}
            >
              {tab === "feed" ? `FEED (${posts.length})` : tab === "rankings" ? "RANKINGS" : tab === "members" ? `MEMBERS (${members.length})` : tab}
            </button>
          ))}
        </div>

        <main className="px-4 pb-32 pt-3">
          {/* FEED TAB */}
          {activeTab === "feed" && (
            <div>
              {/* SEEDED HOT TAKE — pinned, gives every member a side to take */}
              <SeededHotTake
                clubName={club.name}
                onPickStance={(starter) => {
                  setText((t) => starter + t);
                  setReplyingToHotTake(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              />

              {/* FILM OF THE WEEK — voting widget */}
              <FilmOfTheWeek clubId={id} userId={user?.id} canPost={canPost} />

              {/* POLLS */}
              <ClubPolls clubId={id} userId={user?.id} canPost={canPost} />

              {/* CONVERSATION PROMPTS — tap to pre-fill compose */}
              <ConversationPrompts
                clubName={club.name}
                onSelectPrompt={(prompt: string) => { setText(prompt); textareaRef.current?.focus(); }}
              />

              {/* COMPOSE BOX */}
              {canPost ? (
                <div className={`mb-4 rounded-2xl border bg-white/[0.03] p-3 transition ${replyingToHotTake ? "border-fc-red/30" : "border-white/[0.08]"}`}>
                  {/* Hot take reply tag */}
                  {replyingToHotTake && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-fc-red/15 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-fc-red">
                        📌 Replying to pinned hot take
                      </span>
                      <button
                        type="button"
                        onClick={() => { setReplyingToHotTake(false); setText(""); }}
                        className="ml-auto font-mono text-[8px] text-white/25 hover:text-white/50"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-anton text-[12px]"
                      style={{ background: `linear-gradient(135deg, ${RED}, #9C7BFF)`, color: BG }}
                    >
                      {(profile?.display_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="One sentence. Hot take only."
                        rows={2}
                        className="w-full resize-none bg-transparent font-sans text-[13px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/30 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                            setReplyingToHotTake(false);
                          }
                        }}
                      />
                      <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 mt-1">
                        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/25">
                          {text.length > 0 ? `${text.length} chars` : "enter to post"}
                        </span>
                        <button
                          type="button"
                          onClick={() => { handleSend(); setReplyingToHotTake(false); }}
                          disabled={!text.trim() || sending}
                          className="rounded-full bg-fc-red px-4 py-1.5 font-anton text-[9px] tracking-[0.12em] text-white transition disabled:opacity-40 active:scale-95"
                        >
                          {sending ? "..." : "POST"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !joined ? (
                <div className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                    Join this club to post
                  </p>
                </div>
              ) : null}

              {/* POSTS */}
              {feedLoading ? (
                <div className="py-8 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                    Loading...
                  </p>
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                  <p className="font-anton text-[18px] text-[#F4EFD8]">NO POSTS YET</p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                    Be the first to start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post: any) => (
                    <PostCard key={post.id} post={post} currentUserId={user?.id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RANKINGS TAB */}
          {activeTab === "rankings" && (
            <ClubRankings clubId={id} members={members} />
          )}

          {/* MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="space-y-2">
              {members.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                    No members yet
                  </p>
                </div>
              ) : (
                members.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.1]"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-anton text-[14px]"
                      style={{ background: `linear-gradient(135deg, ${RED}, #9C7BFF)`, color: BG }}
                    >
                      {(member.display_name || member.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-anton text-[13px] tracking-[0.02em] text-[#F4EFD8]">
                        {member.display_name || member.username}
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
                        @{member.username}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h3 className="font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8] mb-2">ABOUT</h3>
                <p className="font-sans text-[13px] leading-relaxed text-[#F4EFD8]/60">
                  {club.tagline}. A space for film lovers to share, discuss, and celebrate cinema together.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h3 className="font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8] mb-2">RULES</h3>
                <div className="space-y-2 font-sans text-[12px] text-[#F4EFD8]/50">
                  <p>1. Respect all members and their opinions</p>
                  <p>2. Use spoiler warnings for new releases</p>
                  <p>3. Keep discussions on topic</p>
                  <p>4. No spam or self-promotion</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h3 className="font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8] mb-3">STATS</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="font-anton text-[20px] text-[#F4EFD8]">{members.length}</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">members</p>
                  </div>
                  <div className="text-center">
                    <p className="font-anton text-[20px] text-[#F4EFD8]">{posts.length}</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">posts</p>
                  </div>
                  <div className="text-center">
                    <p className="font-anton text-[20px] text-[#F4EFD8]">
                      {posts.filter((p: any) => p.film_logs).length}
                    </p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">films shared</p>
                  </div>
                </div>
              </div>

              {/* SCREENING — COMING SOON */}
              <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.08] to-indigo-500/[0.04] p-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5">
                  <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-purple-300">COMING SOON</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-400/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8]">SCREENING</h3>
                    <p className="font-sans text-[11px] text-[#F4EFD8]/50">Watch films together, react in real time</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                    <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-purple-300/70">LIVE CHAT</p>
                    <p className="mt-0.5 font-sans text-[9px] text-[#F4EFD8]/40">React in real time</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                    <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-purple-300/70">SYNC PLAY</p>
                    <p className="mt-0.5 font-sans text-[9px] text-[#F4EFD8]/40">Everyone watches together</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                    <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-purple-300/70">VOTE NEXT</p>
                    <p className="mt-0.5 font-sans text-[9px] text-[#F4EFD8]/40">Pick the next film</p>
                  </div>
                </div>
              </div>

              {/* GAMIFIED ELEMENTS */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h3 className="font-anton text-[14px] tracking-[0.04em] text-[#F4EFD8] mb-3">CLUB BADGES</h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Weekly Challenge */}
                  <div className="rounded-xl bg-gradient-to-br from-amber-500/[0.08] to-orange-600/[0.04] border border-amber-400/20 p-3 text-center">
                    <div className="text-[28px] mb-1">🎬</div>
                    <p className="font-anton text-[11px] text-[#F4EFD8]">WEEKLY PICK</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-amber-300/60 mt-1">
                      Log this week&apos;s club pick
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
                    </div>
                    <p className="mt-1 font-mono text-[7px] text-amber-300/50">3/5 MEMBERS LOGGED</p>
                  </div>

                  {/* Streak Challenge */}
                  <div className="rounded-xl bg-gradient-to-br from-rose-500/[0.08] to-pink-600/[0.04] border border-rose-400/20 p-3 text-center">
                    <div className="text-[28px] mb-1">🔥</div>
                    <p className="font-anton text-[11px] text-[#F4EFD8]">CLUB STREAK</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-rose-300/60 mt-1">
                      Keep the club active daily
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <div
                          key={day}
                          className={`h-3 w-3 rounded-sm ${
                            day <= 5 ? "bg-gradient-to-t from-rose-500 to-orange-400" : "bg-white/[0.06] border border-white/[0.08]"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 font-mono text-[7px] text-rose-300/50">5 DAY STREAK</p>
                  </div>

                  {/* Top Contributor */}
                  <div className="rounded-xl bg-gradient-to-br from-cyan-500/[0.08] to-blue-600/[0.04] border border-cyan-400/20 p-3 text-center">
                    <div className="text-[28px] mb-1">👑</div>
                    <p className="font-anton text-[11px] text-[#F4EFD8]">TOP VOICE</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-cyan-300/60 mt-1">
                      Most posts this week
                    </p>
                    <p className="mt-2 font-anton text-[14px] text-cyan-300">—</p>
                    <p className="font-mono text-[7px] text-cyan-300/50">BE THE FIRST</p>
                  </div>

                  {/* Consensus Rating */}
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/[0.08] to-green-600/[0.04] border border-emerald-400/20 p-3 text-center">
                    <div className="text-[28px] mb-1">🎯</div>
                    <p className="font-anton text-[11px] text-[#F4EFD8]">CONSENSUS</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-emerald-300/60 mt-1">
                      All members rate within 1pt
                    </p>
                    <p className="mt-2 font-anton text-[14px] text-emerald-300">0</p>
                    <p className="font-mono text-[7px] text-emerald-300/50">FILMS IN CONSENSUS</p>
                  </div>

                  {/* Hot Take */}
                  <div className="rounded-xl bg-gradient-to-br from-red-500/[0.08] to-orange-600/[0.04] border border-red-400/20 p-3 text-center">
                    <div className="text-[28px] mb-1">🌶️</div>
                    <p className="font-anton text-[11px] text-[#F4EFD8]">HOT TAKE</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-red-300/60 mt-1">
                      Rate 3+ pts off the club avg
                    </p>
                    <p className="mt-2 font-anton text-[14px] text-red-300">0</p>
                    <p className="font-mono text-[7px] text-red-300/50">HOT TAKES LOGGED</p>
                  </div>

                  {/* Cinephile XP */}
                  <div className="rounded-xl bg-gradient-to-br from-violet-500/[0.08] to-purple-600/[0.04] border border-violet-400/20 p-3 text-center">
                    <div className="text-[28px] mb-1">⚡</div>
                    <p className="font-anton text-[11px] text-[#F4EFD8]">CLUB XP</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-violet-300/60 mt-1">
                      Log, post, reply to earn XP
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-violet-500 to-purple-400" />
                    </div>
                    <p className="mt-1 font-mono text-[7px] text-violet-300/50">LEVEL 1 · 30 XP</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   CONVERSATION PROMPTS — tap to spark club discussion
   ============================================================ */
const CLUB_PROMPTS = [
  { emoji: "🌶️", text: "Hot take:" },
  { emoji: "🎬", text: "What did you just watch?" },
  { emoji: "🏆", text: "What's your favourite film of all time?" },
  { emoji: "🎭", text: "Most underrated director?" },
  { emoji: "😭", text: "Film that made you cry the hardest?" },
  { emoji: "🔄", text: "Film you've rewatched the most?" },
  { emoji: "💀", text: "Film everyone loves but you don't?" },
  { emoji: "💎", text: "Most underrated film you've seen?" },
  { emoji: "🍿", text: "Best cinema experience?" },
  { emoji: "🌙", text: "Perfect late-night film?" },
];

function ConversationPrompts({ clubName, onSelectPrompt }: { clubName: string; onSelectPrompt: (prompt: string) => void }) {
  // Show 3 random prompts, rotate daily based on date + club name seed
  const today = new Date().toISOString().slice(0, 10);
  const seed = (today + clubName).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = [...CLUB_PROMPTS].sort((a, b) => {
    const ha = ((seed * 31 + a.text.charCodeAt(0)) % 997);
    const hb = ((seed * 31 + b.text.charCodeAt(0)) % 997);
    return ha - hb;
  });
  const shown = shuffled.slice(0, 3);

  return (
    <div className="mb-3">
      <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#F4EFD8]/30 mb-2">CONVERSATION STARTERS</p>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((prompt) => (
          <button
            key={prompt.text}
            type="button"
            onClick={() => onSelectPrompt(prompt.text + " ")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 transition hover:border-fc-red/30 hover:bg-white/[0.06] active:scale-95"
          >
            <span className="text-[14px]">{prompt.emoji}</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#F4EFD8]/55 whitespace-nowrap">
              {prompt.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   POST CARD — rich social post with spoiler blur, read more, replies
   ============================================================ */
function PostCard({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const isMe = post.user_id === currentUserId;
  const hasFilm = !!post.film_logs;
  const timeAgo = getTimeAgo(post.created_at);
  const displayName = post.profiles?.display_name || post.profiles?.username || "member";
  const initial = displayName.charAt(0).toUpperCase();

  // Spoiler reveal state
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  // Read more state
  const [expanded, setExpanded] = useState(false);
  // Reply state
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<any[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  // Inline reply-to-reply
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [nestedReplyText, setNestedReplyText] = useState("");
  // Reaction state (BeReal-style quick reactions)
  const [reactions, setReactions] = useState<{ emoji: ReactionType; count: number; user_ids: string[] }[]>([]);
  const [reactionsLoaded, setReactionsLoaded] = useState(false);

  const hasSpoilers = hasFilm && post.film_logs?.has_spoilers && !spoilerRevealed && !isMe;
  const bodyText = post.body || (hasFilm ? post.film_logs?.review_text : null);
  const isLong = bodyText && bodyText.length > 180;
  const displayText = isLong && !expanded ? bodyText.slice(0, 180) + "..." : bodyText;

  // Load replies when toggled open
  const loadReplies = async () => {
    if (repliesLoaded) return;
    const { data } = await supabase
      .from("club_post_replies")
      .select("*, profiles(*)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setReplies(data ?? []);
    setReplyCount(data?.length ?? 0);
    setRepliesLoaded(true);
  };

  // Count replies on mount
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("club_post_replies")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      setReplyCount(count ?? 0);
    })();
  }, [post.id]);

  // Load reactions on mount
  useEffect(() => {
    (async () => {
      const data = await getPostReactions(post.id);
      setReactions(data);
      setReactionsLoaded(true);
    })();
  }, [post.id]);

  const handleReaction = async (emoji: ReactionType) => {
    if (!currentUserId) return;
    const { action } = await togglePostReaction(post.id, currentUserId, emoji);
    // Optimistic update
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (action === "added") {
        if (existing) {
          return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, user_ids: [...r.user_ids, currentUserId] } : r);
        } else {
          return [...prev, { emoji, count: 1, user_ids: [currentUserId] }];
        }
      } else {
        if (existing && existing.count <= 1) {
          return prev.filter((r) => r.emoji !== emoji);
        }
        return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, user_ids: r.user_ids.filter((id) => id !== currentUserId) } : r);
      }
    });
  };

  const handleToggleReplies = async () => {
    if (!showReplies) await loadReplies();
    setShowReplies(!showReplies);
  };

  const handleSendReply = async () => {
    if (!currentUserId || !replyText.trim()) return;
    setSendingReply(true);
    const { data, error } = await createPostReply({
      post_id: post.id,
      user_id: currentUserId,
      body: replyText.trim(),
    });
    if (data && !error) {
      setReplies((prev) => [...prev, data]);
      setReplyCount((c) => c + 1);
      setReplyText("");
    }
    setSendingReply(false);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition hover:border-white/[0.1]">
      {/* Film still banner if this is a shared log */}
      {hasFilm && post.film_logs.backdrop_path && (
        <Link href={`/log/${post.film_logs.id}`} className="block">
          <div className="relative h-[100px] w-full">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${TMDB_IMG}${post.film_logs.backdrop_path})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D18] via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
              <div>
                <p className="font-anton text-[14px] tracking-[0.02em] text-[#F4EFD8] drop-shadow-lg">
                  {post.film_logs.title}
                </p>
                <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#F4EFD8]/50">
                  {post.film_logs.release_year}
                </p>
              </div>
              {post.film_logs.rating != null && (
                <span className="rounded-full bg-fc-red/90 px-2 py-0.5 font-anton text-[11px] text-white">
                  {post.film_logs.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Film info without backdrop */}
      {hasFilm && !post.film_logs.backdrop_path && post.film_logs.poster_path && (
        <Link href={`/log/${post.film_logs.id}`} className="flex items-center gap-3 border-b border-white/[0.06] p-3">
          <div
            className="h-[48px] w-[32px] shrink-0 overflow-hidden rounded-md"
            style={{
              backgroundImage: `url(${TMDB_IMG}${post.film_logs.poster_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: SURFACE,
            }}
          />
          <div>
            <p className="font-anton text-[13px] text-[#F4EFD8]">{post.film_logs.title}</p>
            {post.film_logs.rating != null && (
              <span className="font-anton text-[11px] text-fc-red">{post.film_logs.rating.toFixed(1)}/10</span>
            )}
          </div>
        </Link>
      )}

      {/* Post content */}
      <div className="p-3.5">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-anton text-[10px]"
            style={{
              background: isMe ? `linear-gradient(135deg, ${RED}, #9C7BFF)` : "linear-gradient(135deg, #3A3960, #2A2945)",
              color: isMe ? BG : INK,
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-anton text-[11px] tracking-[0.02em] text-[#F4EFD8]">
              {displayName}
            </span>
            <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#F4EFD8]/30">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Body text with spoiler blur + read more */}
        {bodyText ? (
          <div className="relative">
            {/* Spoiler warning bar */}
            {hasFilm && post.film_logs?.has_spoilers && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1 w-1 rounded-full bg-fc-red" />
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-fc-red/70">SPOILERS</span>
                {hasSpoilers && (
                  <button
                    type="button"
                    onClick={() => setSpoilerRevealed(true)}
                    className="ml-auto flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 transition hover:bg-white/[0.1]"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F4EFD8" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="font-mono text-[6px] uppercase tracking-[0.12em] text-[#F4EFD8]/50">REVEAL</span>
                  </button>
                )}
              </div>
            )}
            <p
              className={`font-sans text-[13px] leading-[1.5] text-[#F4EFD8]/80 transition-all duration-300 ${
                hasSpoilers ? "blur-[5px] select-none" : ""
              }`}
            >
              {displayText}
            </p>
            {hasSpoilers && (
              <button
                type="button"
                onClick={() => setSpoilerRevealed(true)}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.12] px-3 py-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4EFD8" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#F4EFD8]">TAP TO REVEAL</span>
                </div>
              </button>
            )}
            {/* Read more button */}
            {isLong && !hasSpoilers && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-fc-red/70 hover:text-fc-red transition"
              >
                {expanded ? "SHOW LESS" : "READ MORE"}
              </button>
            )}
          </div>
        ) : !post.body && hasFilm ? (
          <p className="font-sans text-[12px] italic text-[#F4EFD8]/40">
            shared a film log
          </p>
        ) : null}

        {/* Reactions + Reply bar */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/[0.04]">
          {/* Instant emoji reactions */}
          {(["❤️", "👀", "🤔"] as const).map((emoji) => {
            const r = reactions.find((rx) => (rx.emoji as string) === emoji);
            const myReaction = r?.user_ids.includes(currentUserId ?? "");
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReaction(emoji as ReactionType)}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[14px] transition active:scale-75 ${
                  myReaction
                    ? "bg-white/[0.12] ring-1 ring-white/20"
                    : "bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <span>{emoji}</span>
                {r && r.count > 0 && (
                  <span className="font-mono text-[8px] text-[#F4EFD8]/60">{r.count}</span>
                )}
              </button>
            );
          })}
          {/* Reply button */}
          <button
            type="button"
            onClick={handleToggleReplies}
            className="ml-auto flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40 hover:text-[#F4EFD8]/70 transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? "REPLY" : "REPLIES"}` : "REPLY"}
          </button>
        </div>
      </div>

      {/* REPLIES SECTION */}
      {showReplies && (
        <div className="border-t border-white/[0.04] bg-white/[0.01]">
          {/* Existing replies */}
          {replies.length > 0 && (
            <div className="px-3.5 pt-2 space-y-2">
              {replies.map((reply: any) => {
                const rName = reply.profiles?.display_name || reply.profiles?.username || "member";
                const rInitial = rName.charAt(0).toUpperCase();
                const rIsMe = reply.user_id === currentUserId;
                const isReplyingToThis = replyingToId === reply.id;
                return (
                  <div key={reply.id}>
                    <div className="flex gap-2">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-anton text-[7px] mt-0.5"
                        style={{
                          background: rIsMe ? `linear-gradient(135deg, ${RED}, #9C7BFF)` : "linear-gradient(135deg, #3A3960, #2A2945)",
                          color: rIsMe ? BG : INK,
                        }}
                      >
                        {rInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-anton text-[9px] tracking-[0.02em] text-[#F4EFD8]">{rName}</span>
                        <span className="ml-1.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[#F4EFD8]/25">
                          {getTimeAgo(reply.created_at)}
                        </span>
                        <p className="mt-0.5 font-sans text-[12px] leading-[1.4] text-[#F4EFD8]/70">
                          {reply.body}
                        </p>
                        {currentUserId && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(isReplyingToThis ? null : reply.id);
                              setNestedReplyText(isReplyingToThis ? "" : `@${rName} `);
                            }}
                            className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-[#F4EFD8]/30 hover:text-fc-red/70 transition"
                          >
                            {isReplyingToThis ? "cancel" : "reply"}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Inline nested reply input */}
                    {isReplyingToThis && (
                      <div className="ml-7 mt-1.5 flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={nestedReplyText}
                          onChange={(e) => setNestedReplyText(e.target.value)}
                          placeholder={`Reply to ${rName}…`}
                          className="flex-1 rounded-full border border-fc-red/20 bg-white/[0.03] px-3 py-1.5 font-sans text-[11px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/40 focus:outline-none"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && nestedReplyText.trim() && currentUserId) {
                              e.preventDefault();
                              setSendingReply(true);
                              const { data } = await createPostReply({
                                post_id: post.id,
                                user_id: currentUserId,
                                body: nestedReplyText.trim(),
                              });
                              if (data) {
                                setReplies((prev) => [...prev, data]);
                                setReplyCount((c) => c + 1);
                              }
                              setNestedReplyText("");
                              setReplyingToId(null);
                              setSendingReply(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={!nestedReplyText.trim() || sendingReply}
                          onClick={async () => {
                            if (!nestedReplyText.trim() || !currentUserId) return;
                            setSendingReply(true);
                            const { data } = await createPostReply({
                              post_id: post.id,
                              user_id: currentUserId,
                              body: nestedReplyText.trim(),
                            });
                            if (data) {
                              setReplies((prev) => [...prev, data]);
                              setReplyCount((c) => c + 1);
                            }
                            setNestedReplyText("");
                            setReplyingToId(null);
                            setSendingReply(false);
                          }}
                          className="rounded-full bg-fc-red p-1.5 transition disabled:opacity-30 active:scale-95"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply input */}
          {currentUserId && (
            <div className="px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-sans text-[12px] text-[#F4EFD8] placeholder:text-[#F4EFD8]/25 focus:border-fc-red/30 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="rounded-full bg-fc-red p-1.5 transition disabled:opacity-30 active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ============================================================
   CLUB RANKINGS — avg-rating leaderboard of films shared to club
   e.g. A24 club → films shared IN A24 club, ranked by member avg rating
   ============================================================ */
function ClubRankings({ clubId, members }: { clubId: string; members: any[] }) {
  const [rankings, setRankings] = useState<any[]>([]);
  const [clubName, setClubName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId || members.length === 0) { setLoading(false); return; }
    (async () => {
      try {
        // Fetch club name
        const { data: clubData } = await supabase
          .from("clubs")
          .select("name")
          .eq("id", clubId)
          .single();

        if (clubData) {
          setClubName(clubData.name);
        }

        // Fetch club_posts for this club to get film_log_ids that were shared IN this club
        const { data: posts } = await supabase
          .from("club_posts")
          .select("log_id")
          .eq("club_id", clubId);

        if (!posts || posts.length === 0) { setRankings([]); setLoading(false); return; }

        // Extract unique log_ids
        const logIds = [...new Set(posts.map((p: any) => p.log_id))];

        // Fetch film_logs for those log_ids
        const { data: logs } = await supabase
          .from("film_logs")
          .select("tmdb_id, title, poster_path, backdrop_path, rating, release_year")
          .in("id", logIds)
          .not("rating", "is", null)
          .order("created_at", { ascending: false });

        if (!logs || logs.length === 0) { setRankings([]); setLoading(false); return; }

        // Group by tmdb_id and compute average rating
        const filmMap = new Map<number, { title: string; poster_path: string | null; backdrop_path: string | null; release_year: number | null; ratings: number[] }>();
        for (const log of logs) {
          if (!filmMap.has(log.tmdb_id)) {
            filmMap.set(log.tmdb_id, {
              title: log.title,
              poster_path: log.poster_path,
              backdrop_path: log.backdrop_path,
              release_year: log.release_year,
              ratings: [],
            });
          }
          filmMap.get(log.tmdb_id)!.ratings.push(log.rating!);
        }

        // Compute averages and sort descending
        const ranked = [...filmMap.entries()]
          .map(([tmdbId, film]) => ({
            tmdbId,
            ...film,
            avgRating: film.ratings.reduce((a, b) => a + b, 0) / film.ratings.length,
            ratingCount: film.ratings.length,
          }))
          .sort((a, b) => b.avgRating - a.avgRating)
          .slice(0, 30);

        setRankings(ranked);
      } catch (err) {
        console.error("Rankings error:", err);
      }
      setLoading(false);
    })();
  }, [clubId, members]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">Loading rankings...</p>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <p className="font-anton text-[18px] text-[#F4EFD8]">NO RANKINGS YET</p>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
          Members need to log and rate films to build the leaderboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#F4EFD8]/40 mb-3">
        {clubName ? `${clubName.toUpperCase()} LEADERBOARD` : "CLUB LEADERBOARD"} · AVG MEMBER RATING
      </p>
      {rankings.map((film, idx) => (
        <div
          key={film.tmdbId}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 transition hover:border-white/[0.12]"
        >
          {/* Rank */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-anton text-[14px]"
            style={{
              background: idx < 3 ? `linear-gradient(135deg, ${RED}, #FF8A5C)` : "rgba(255,255,255,0.05)",
              color: idx < 3 ? "#0E0D18" : "#F4EFD8",
              border: idx >= 3 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}
          >
            {idx + 1}
          </div>

          {/* Poster */}
          <div
            className="h-[48px] w-[32px] shrink-0 overflow-hidden rounded-md"
            style={{
              backgroundImage: film.poster_path ? `url(${TMDB_IMG}${film.poster_path})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: SURFACE,
            }}
          />

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-anton text-[13px] tracking-[0.02em] text-[#F4EFD8]">
              {film.title}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#F4EFD8]/40">
              {film.release_year || "—"} · {film.ratingCount} {film.ratingCount === 1 ? "rating" : "ratings"}
            </p>
          </div>

          {/* Average rating */}
          <div className="shrink-0 text-right">
            <p className="font-anton text-[18px] leading-[1] text-fc-red">
              {film.avgRating.toFixed(1)}
            </p>
            <p className="font-mono text-[6px] uppercase tracking-[0.14em] text-[#F4EFD8]/30">AVG</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
