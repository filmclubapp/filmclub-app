"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import type { Club, ClubPost, FilmLog, Profile } from "./supabase";

const MVP_CLUBS = [
  {
    name: "A24 Lovers",
    tagline: "slow burns, loud silences, perfect casting",
    category: "STUDIO",
    cover_tmdb_backdrop: "/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg",
    accent_gradient: "linear-gradient(135deg, #5BC2E7, #2A2645)",
  },
  {
    name: "Rom-Com Obsessed",
    tagline: "when harry met sally changed everything",
    category: "GENRE",
    cover_tmdb_backdrop: "/sGKgOeOnGaEjjE7QlgVFaBRDMHr.jpg",
    accent_gradient: "linear-gradient(135deg, #FFB199, #9C3D6E)",
  },
  {
    name: "Nolan Heads",
    tagline: "time is a flat circle of IMAX tickets",
    category: "DIRECTOR",
    cover_tmdb_backdrop: "/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg",
    accent_gradient: "linear-gradient(135deg, #9C7BFF, #1A1929)",
  },
  {
    name: "90s Cinema",
    tagline: "the decade that broke every rule",
    category: "ERA",
    cover_tmdb_backdrop: "/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg",
    accent_gradient: "linear-gradient(135deg, #FFB199, #3D1F5C)",
  },
  {
    name: "International Films",
    tagline: "cinema has no borders",
    category: "CULTURE",
    cover_tmdb_backdrop: "/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg",
    accent_gradient: "linear-gradient(135deg, #2ECC71, #1A1929)",
  },
] as const;

/* ---- Clubs list (with fallback if view doesn't exist) ---- */
export function useClubs() {
  const [clubs, setClubs] = useState<(Club & { member_count: number; post_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClubs = useCallback(async () => {
    // Try the view first
    const { data, error } = await supabase
      .from("clubs_with_counts")
      .select("*")
      .order("member_count", { ascending: false });

    if (!error && data && data.length > 0) {
      setClubs(data);
    } else {
      // Fallback: read from clubs table directly
      const { data: fallback } = await supabase
        .from("clubs")
        .select("*")
        .order("created_at", { ascending: false });
      setClubs((fallback ?? []).map((c: any) => ({ ...c, member_count: 0, post_count: 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);
  return { clubs, loading, refresh: fetchClubs };
}

/* ---- My clubs (clubs user has joined) ---- */
export function useMyClubs(userId: string | undefined) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("club_memberships")
      .select("club_id, clubs(*)")
      .eq("user_id", userId);
    const joined = (data ?? []).map((d: any) => d.clubs).filter(Boolean);
    setClubs(joined);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Re-fetch when auth session refreshes (fixes disappearing clubs on return)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        fetch();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetch]);

  return { clubs, loading, refresh: fetch };
}

/* ---- Join / leave club ---- */
export function useClubMembership(userId: string | undefined) {
  const join = useCallback(async (clubId: string) => {
    if (!userId) return;
    await supabase.from("club_memberships").insert({ club_id: clubId, user_id: userId, role: "member" });
  }, [userId]);

  const leave = useCallback(async (clubId: string) => {
    if (!userId) return;
    await supabase.from("club_memberships").delete().eq("club_id", clubId).eq("user_id", userId);
  }, [userId]);

  const isMember = useCallback(async (clubId: string): Promise<boolean> => {
    if (!userId) return false;
    const { data } = await supabase
      .from("club_memberships")
      .select("club_id")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle();
    return !!data;
  }, [userId]);

  return { join, leave, isMember };
}

/** Creates a club owned by the user and adds them as owner in club_memberships. */
export async function createUserClub(
  userId: string,
  input: { name: string; tagline?: string; category?: string },
): Promise<{ clubId: string } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Name your club." };
  const { data: club, error } = await supabase
    .from("clubs")
    .insert({
      name,
      tagline: (input.tagline ?? "").trim(),
      category: (input.category ?? "GENERAL").trim() || "GENERAL",
      created_by: userId,
      is_seeded: false,
    })
    .select("id")
    .single();
  if (error || !club) {
    return { error: error?.message ?? "Couldn't create the club." };
  }
  const { error: memErr } = await supabase.from("club_memberships").insert({
    club_id: club.id,
    user_id: userId,
    role: "owner",
  });
  if (memErr) {
    return { error: memErr.message || "Club created but we couldn't add you as a member." };
  }
  return { clubId: club.id as string };
}

/* ---- Ensure 5 MVP clubs exist ---- */
export async function ensureMvpClubs(userId: string | undefined) {
  if (!userId) return;

  try {
    const { data: existing } = await supabase
      .from("clubs")
      .select("name")
      .in("name", MVP_CLUBS.map((c) => c.name));

    const existingNames = new Set((existing ?? []).map((c: any) => c.name));
    const missing = MVP_CLUBS.filter((club) => !existingNames.has(club.name));
    if (missing.length === 0) return;

    const rows = missing.map((club) => ({
      ...club,
      created_by: userId,
      is_seeded: true,
    }));

    await supabase.from("clubs").insert(rows);
  } catch {
    // Silently fail — clubs may have been seeded via SQL already
  }
}

/* ---- Club feed (posts in a club) ---- */
export function useClubFeed(clubId: string | undefined) {
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clubId) { setLoading(false); return; }
    const { data } = await supabase
      .from("club_posts")
      .select("*, profiles(*), film_logs(*)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data ?? []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Re-fetch on session refresh (fixes disappearing posts on return)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        fetch();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetch]);

  return { posts, loading, refresh: fetch };
}

/* ---- Create a text post in club chat ---- */
export async function createClubPost(input: {
  club_id: string;
  user_id: string;
  body: string;
  log_id?: string | null;
}) {
  // Ensure profile exists (FK: club_posts.user_id → profiles.id)
  await ensureProfile(input.user_id);

  const { data, error } = await supabase
    .from("club_posts")
    .insert({
      club_id: input.club_id,
      user_id: input.user_id,
      body: input.body,
      log_id: input.log_id ?? null,
    })
    .select("*, profiles(*), film_logs(*)")
    .single();
  return { data, error };
}

/* ---- Ensure profile row exists (safety net for FK constraint) ---- */
export async function ensureProfile(userId: string, fallbackUsername?: string): Promise<{ error: any }> {
  // Check if profile already exists
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (data) return { error: null }; // profile exists

  // Create a minimal profile so FK constraints pass
  const username = fallbackUsername || `user_${userId.slice(0, 8)}`;
  const { error } = await supabase
    .from("profiles")
    .insert({ id: userId, username, display_name: username });

  // Ignore unique-constraint errors (race condition / already exists)
  if (error && error.code === "23505") return { error: null };
  return { error };
}

/* ---- Log a film ---- */
export async function createLog(log: Omit<FilmLog, "id" | "created_at">) {
  // Ensure the user has a profile row (FK: film_logs.user_id → profiles.id)
  const { error: profileError } = await ensureProfile(log.user_id);
  if (profileError) {
    return { data: null, error: profileError };
  }

  const { data, error } = await supabase
    .from("film_logs")
    .insert(log)
    .select()
    .single();
  return { data, error };
}

/* ---- Update an existing log (edit rating/review) ---- */
export async function updateLog(
  logId: string,
  updates: { rating?: number | null; review_text?: string | null; has_spoilers?: boolean }
) {
  const { data, error } = await supabase
    .from("film_logs")
    .update(updates)
    .eq("id", logId)
    .select()
    .single();
  return { data, error };
}

/* ---- Watchlist ---- */
export function useWatchlist(userId: string | undefined) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = useCallback(async (tmdbId: number, title: string, posterPath: string | null, releaseYear: number | null) => {
    if (!userId) return;
    const { error } = await supabase.from("watchlist").insert({
      user_id: userId,
      tmdb_id: tmdbId,
      title,
      poster_path: posterPath,
      release_year: releaseYear,
    });
    if (!error) await fetch();
    return { error };
  }, [userId, fetch]);

  const remove = useCallback(async (tmdbId: number) => {
    if (!userId) return;
    await supabase.from("watchlist").delete().eq("user_id", userId).eq("tmdb_id", tmdbId);
    await fetch();
  }, [userId, fetch]);

  const isOnWatchlist = useCallback((tmdbId: number) => {
    return items.some((i: any) => i.tmdb_id === tmdbId);
  }, [items]);

  return { items, loading, add, remove, isOnWatchlist, refresh: fetch };
}

/* ---- Club post replies ---- */
export async function createPostReply(input: {
  post_id: string;
  user_id: string;
  body: string;
}) {
  await ensureProfile(input.user_id);
  const { data, error } = await supabase
    .from("club_post_replies")
    .insert(input)
    .select("*, profiles(*)")
    .single();
  return { data, error };
}

export function usePostReplies(postId: string | undefined) {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!postId) { setLoading(false); return; }
    const { data } = await supabase
      .from("club_post_replies")
      .select("*, profiles(*)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);
    setReplies(data ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { replies, loading, refresh: fetch };
}

/* ---- Share log to club(s) ---- */
export async function shareToClubs(logId: string, userId: string, clubIds: string[], body?: string) {
  const posts = clubIds.map((clubId) => ({
    club_id: clubId,
    user_id: userId,
    log_id: logId,
    body: body || null,
  }));
  const { error } = await supabase.from("club_posts").insert(posts);
  return { error };
}

/* ---- Overlap alerts for a club ---- */
export function useOverlaps(clubId: string | undefined) {
  const [overlaps, setOverlaps] = useState<any[]>([]);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      const { data } = await supabase
        .from("club_overlaps")
        .select("*")
        .eq("club_id", clubId)
        .order("latest_log", { ascending: false })
        .limit(10);
      setOverlaps(data ?? []);
    })();
  }, [clubId]);

  return overlaps;
}

/* ---- User's film logs ---- */
export function useUserLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<FilmLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("film_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Re-fetch on session refresh (fixes disappearing logs on return)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        fetch();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetch]);

  return { logs, loading, refresh: fetch };
}

/* ---- Taste profile (computed from logs) ---- */
export interface TasteProfile {
  totalLogged: number;
  avgRating: number;
  topGenres: { id: number; name: string; count: number }[];
  decades: { decade: string; count: number }[];
  recentlyRatedHigh: FilmLog[];
}

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
};

export function computeTasteProfile(logs: FilmLog[]): TasteProfile {
  const totalLogged = logs.length;
  const rated = logs.filter((l) => l.rating != null);
  const avgRating = rated.length
    ? rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length
    : 0;

  // Genre counts
  const genreCounts = new Map<number, number>();
  for (const log of logs) {
    const gids = (log as any).genre_ids ?? [];
    for (const gid of gids) {
      genreCounts.set(gid, (genreCounts.get(gid) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: GENRE_MAP[id] ?? `#${id}`, count }));

  // Decades
  const decadeCounts = new Map<string, number>();
  for (const log of logs) {
    const year = (log as any).release_year;
    if (year) {
      const decade = `${Math.floor(year / 10) * 10}s`;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
  }
  const decades = [...decadeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([decade, count]) => ({ decade, count }));

  const recentlyRatedHigh = rated
    .filter((l) => (l.rating ?? 0) >= 8)
    .slice(0, 5);

  return { totalLogged, avgRating, topGenres, decades, recentlyRatedHigh };
}

/* ---- Post reactions — POSITION-BASED (Film Club voice) ----
   "Likes die in one direction; positions start threads."
   The emoji column in Supabase stores a label string. */
export const REACTION_TYPES = ["HOT", "COLD", "SAME", "NAH"] as const;
export type ReactionType = typeof REACTION_TYPES[number];

export const REACTION_LABELS: Record<ReactionType, string> = {
  HOT:  "HOT TAKE",
  COLD: "COLD TAKE",
  SAME: "SAME",
  NAH:  "DISAGREE",
};

export async function togglePostReaction(postId: string, userId: string, emoji: ReactionType) {
  await ensureProfile(userId);
  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("club_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    // Remove reaction (toggle off)
    await supabase.from("club_post_reactions").delete().eq("id", existing.id);
    return { action: "removed" as const };
  } else {
    // Add reaction
    await supabase.from("club_post_reactions").insert({ post_id: postId, user_id: userId, emoji });
    return { action: "added" as const };
  }
}

export async function getPostReactions(postId: string): Promise<{ emoji: ReactionType; count: number; user_ids: string[] }[]> {
  const { data } = await supabase
    .from("club_post_reactions")
    .select("emoji, user_id")
    .eq("post_id", postId);

  if (!data || data.length === 0) return [];

  // Group by emoji
  const map = new Map<string, string[]>();
  for (const r of data) {
    if (!map.has(r.emoji)) map.set(r.emoji, []);
    map.get(r.emoji)!.push(r.user_id);
  }

  return [...map.entries()].map(([emoji, user_ids]) => ({
    emoji: emoji as ReactionType,
    count: user_ids.length,
    user_ids,
  }));
}

/* ---- Compute streak from logs (consecutive days with activity, min 1 for new users) ---- */
export function computeStreak(logs: FilmLog[], memberSince?: string): number {
  if (logs.length === 0) {
    // New account — at least 1 day streak if joined today
    if (memberSince) {
      const joinDate = new Date(memberSince).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      if (joinDate === today) return 1;
    }
    return 0;
  }

  // Get unique dates user logged something (sorted newest first)
  const logDates = new Set<string>();
  for (const log of logs) {
    const d = log.watched_date || log.created_at?.slice(0, 10);
    if (d) logDates.add(d);
  }
  // Also count created_at dates (the act of logging)
  for (const log of logs) {
    if (log.created_at) logDates.add(log.created_at.slice(0, 10));
  }

  const sorted = [...logDates].sort().reverse(); // newest first
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must include today or yesterday to be active
  if (sorted[0] !== today && sorted[0] !== yesterday) {
    return memberSince && new Date(memberSince).toISOString().slice(0, 10) === today ? 1 : 0;
  }

  let streak = 1;
  let currentDate = new Date(sorted[0]);

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevStr = prevDate.toISOString().slice(0, 10);

    if (sorted[i] === prevStr) {
      streak++;
      currentDate = prevDate;
    } else if (sorted[i] === currentDate.toISOString().slice(0, 10)) {
      // Same day, skip
      continue;
    } else {
      break;
    }
  }

  return Math.max(streak, 1); // min 1 for active users
}

/* ---- Club members ---- */
export function useClubMembers(clubId: string | undefined) {
  const [members, setMembers] = useState<Profile[]>([]);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      const { data } = await supabase
        .from("club_memberships")
        .select("profiles(*)")
        .eq("club_id", clubId)
        .limit(20);
      const profiles = (data ?? []).map((d: any) => d.profiles).filter(Boolean);
      setMembers(profiles);
    })();
  }, [clubId]);

  return members;
}

/* ============================================================
   FILM OF THE WEEK — voting / nominations
   Table: club_film_of_week_nominations
     id uuid, club_id uuid, week_start date, tmdb_id int, title text,
     poster_path text, nominated_by uuid, created_at timestamptz
   Table: club_film_of_week_votes
     id uuid, club_id uuid, week_start date, nomination_id uuid,
     user_id uuid, created_at timestamptz UNIQUE(club_id, week_start, user_id)
   ============================================================ */

export interface FilmOfWeekNomination {
  id: string;
  club_id: string;
  week_start: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  nominated_by: string;
  created_at: string;
  vote_count?: number;
  user_voted?: boolean;
}

/** Get the Monday of the current week as YYYY-MM-DD */
export function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 sun
  const diff = day === 0 ? -6 : 1 - day; // shift to monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Days remaining in the voting week (until next Monday) */
export function daysUntilNextMonday(): number {
  const now = new Date();
  const day = now.getDay();
  const daysToMon = day === 0 ? 1 : 8 - day;
  return daysToMon;
}

export function useFilmOfWeek(clubId: string | undefined, userId: string | undefined) {
  const [nominations, setNominations] = useState<FilmOfWeekNomination[]>([]);
  const [loading, setLoading] = useState(true);
  const weekStart = currentWeekStart();

  const fetch = useCallback(async () => {
    if (!clubId) { setLoading(false); return; }
    // 1. Fetch nominations for this club + week
    const { data: noms } = await supabase
      .from("club_film_of_week_nominations")
      .select("*")
      .eq("club_id", clubId)
      .eq("week_start", weekStart);

    if (!noms || noms.length === 0) {
      setNominations([]);
      setLoading(false);
      return;
    }

    // 2. Fetch all votes for this club + week
    const { data: votes } = await supabase
      .from("club_film_of_week_votes")
      .select("nomination_id, user_id")
      .eq("club_id", clubId)
      .eq("week_start", weekStart);

    const voteCounts = new Map<string, number>();
    const myVotes = new Set<string>();
    for (const v of votes ?? []) {
      voteCounts.set(v.nomination_id, (voteCounts.get(v.nomination_id) ?? 0) + 1);
      if (v.user_id === userId) myVotes.add(v.nomination_id);
    }

    const enriched: FilmOfWeekNomination[] = noms.map((n: any) => ({
      ...n,
      vote_count: voteCounts.get(n.id) ?? 0,
      user_voted: myVotes.has(n.id),
    }));

    enriched.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
    setNominations(enriched);
    setLoading(false);
  }, [clubId, weekStart, userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const nominate = useCallback(async (film: { tmdb_id: number; title: string; poster_path: string | null }) => {
    if (!clubId || !userId) return { error: "no-auth" };
    await ensureProfile(userId);
    const { error } = await supabase.from("club_film_of_week_nominations").insert({
      club_id: clubId,
      week_start: weekStart,
      tmdb_id: film.tmdb_id,
      title: film.title,
      poster_path: film.poster_path,
      nominated_by: userId,
    });
    if (!error) await fetch();
    return { error };
  }, [clubId, userId, weekStart, fetch]);

  const vote = useCallback(async (nominationId: string) => {
    if (!clubId || !userId) return;
    await ensureProfile(userId);
    // Upsert: 1 vote per user per club per week
    const { data: existing } = await supabase
      .from("club_film_of_week_votes")
      .select("id, nomination_id")
      .eq("club_id", clubId)
      .eq("week_start", weekStart)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.nomination_id === nominationId) {
        // toggle off
        await supabase.from("club_film_of_week_votes").delete().eq("id", existing.id);
      } else {
        await supabase
          .from("club_film_of_week_votes")
          .update({ nomination_id: nominationId })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("club_film_of_week_votes").insert({
        club_id: clubId,
        week_start: weekStart,
        nomination_id: nominationId,
        user_id: userId,
      });
    }
    await fetch();
  }, [clubId, userId, weekStart, fetch]);

  const winner = nominations[0] && (nominations[0].vote_count ?? 0) > 0 ? nominations[0] : null;

  return { nominations, winner, loading, nominate, vote, refresh: fetch, weekStart };
}

/* ============================================================
   POLLS — quick yes/no or multi-choice polls in clubs
   Table: club_polls
     id uuid, club_id uuid, user_id uuid, question text, options jsonb,
     closes_at timestamptz, created_at timestamptz
   Table: club_poll_votes
     id uuid, poll_id uuid, user_id uuid, option_index int,
     UNIQUE(poll_id, user_id)
   ============================================================ */

export interface ClubPoll {
  id: string;
  club_id: string;
  user_id: string;
  question: string;
  options: string[];
  closes_at: string | null;
  created_at: string;
  // joined / computed
  profiles?: Profile;
  vote_counts?: number[];
  user_vote?: number | null;
  total_votes?: number;
}

export function useClubPolls(clubId: string | undefined, userId: string | undefined) {
  const [polls, setPolls] = useState<ClubPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clubId) { setLoading(false); return; }
    const { data: rawPolls } = await supabase
      .from("club_polls")
      .select("*, profiles(*)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!rawPolls || rawPolls.length === 0) {
      setPolls([]);
      setLoading(false);
      return;
    }

    const pollIds = rawPolls.map((p: any) => p.id);
    const { data: votes } = await supabase
      .from("club_poll_votes")
      .select("poll_id, user_id, option_index")
      .in("poll_id", pollIds);

    const enriched: ClubPoll[] = rawPolls.map((p: any) => {
      const opts: string[] = Array.isArray(p.options) ? p.options : [];
      const counts = new Array(opts.length).fill(0);
      let myVote: number | null = null;
      let total = 0;
      for (const v of votes ?? []) {
        if (v.poll_id === p.id) {
          if (typeof v.option_index === "number" && v.option_index >= 0 && v.option_index < counts.length) {
            counts[v.option_index]++;
            total++;
          }
          if (v.user_id === userId) myVote = v.option_index;
        }
      }
      return {
        ...p,
        options: opts,
        vote_counts: counts,
        user_vote: myVote,
        total_votes: total,
      };
    });

    setPolls(enriched);
    setLoading(false);
  }, [clubId, userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createPoll = useCallback(async (question: string, options: string[]) => {
    if (!clubId || !userId) return { error: "no-auth" };
    await ensureProfile(userId);
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (cleaned.length < 2) return { error: "Need at least 2 options" };

    // Close in 7 days by default
    const closes = new Date(Date.now() + 7 * 86400000).toISOString();
    const { error } = await supabase.from("club_polls").insert({
      club_id: clubId,
      user_id: userId,
      question: question.trim(),
      options: cleaned,
      closes_at: closes,
    });
    if (!error) await fetch();
    return { error };
  }, [clubId, userId, fetch]);

  const vote = useCallback(async (pollId: string, optionIndex: number) => {
    if (!userId) return;
    await ensureProfile(userId);
    // upsert: one vote per user per poll
    const { data: existing } = await supabase
      .from("club_poll_votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("club_poll_votes")
        .update({ option_index: optionIndex })
        .eq("id", existing.id);
    } else {
      await supabase.from("club_poll_votes").insert({
        poll_id: pollId,
        user_id: userId,
        option_index: optionIndex,
      });
    }
    await fetch();
  }, [userId, fetch]);

  return { polls, loading, createPoll, vote, refresh: fetch };
}

/* ---- Hours since last log (for streak nudge) ---- */
export function hoursSinceLastLog(logs: FilmLog[]): number | null {
  if (logs.length === 0) return null;
  const latest = logs.reduce((acc, l) => {
    const t = new Date(l.created_at).getTime();
    return t > acc ? t : acc;
  }, 0);
  if (!latest) return null;
  return Math.floor((Date.now() - latest) / 3600000);
}

/* ---- Streak nudge state: "danger" if streak active but no log today, "broken" if missed ---- */
export function streakNudgeState(logs: FilmLog[], memberSince?: string): "safe" | "danger" | "fresh" {
  const streak = computeStreak(logs, memberSince);
  if (streak === 0) return "fresh";

  const today = new Date().toISOString().slice(0, 10);
  const loggedToday = logs.some((l) => {
    const d = l.watched_date || l.created_at?.slice(0, 10);
    return d === today;
  });
  if (loggedToday) return "safe";
  return "danger"; // streak active but nothing logged today
}

/* ============================================================
   DAILY PROMPT
   One question a day, surfaced on home from 9am local.
   ============================================================ */

export interface DailyPrompt {
  id: string;
  prompt_date: string;
  question: string;
}

export interface DailyPromptAnswer {
  id: string;
  prompt_id: string;
  user_id: string;
  answer: string;
  created_at: string;
  profiles?: Profile | null;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useDailyPrompt(userId: string | undefined) {
  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<DailyPromptAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const today = todayLocal();
    const { data: p } = await supabase
      .from("daily_prompts")
      .select("*")
      .eq("prompt_date", today)
      .maybeSingle();

    if (!p) {
      setPrompt(null);
      setLoading(false);
      return;
    }
    setPrompt(p as DailyPrompt);

    const { data: ans } = await supabase
      .from("daily_prompt_answers")
      .select("*, profiles(*)")
      .eq("prompt_id", (p as DailyPrompt).id)
      .order("created_at", { ascending: false })
      .limit(20);

    setAnswers((ans ?? []) as DailyPromptAnswer[]);
    if (userId) {
      setAnswered((ans ?? []).some((a: any) => a.user_id === userId));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const submit = useCallback(async (answer: string) => {
    if (!prompt || !userId || !answer.trim()) return { error: "missing" };
    await ensureProfile(userId);
    const { error } = await supabase.from("daily_prompt_answers").upsert(
      { prompt_id: prompt.id, user_id: userId, answer: answer.trim() },
      { onConflict: "prompt_id,user_id" },
    );
    if (!error) {
      setAnswered(true);
      await fetch();
    }
    return { error };
  }, [prompt, userId, fetch]);

  return { prompt, answered, answers, loading, submit, refresh: fetch };
}

/* ============================================================
   TASTE TRIBE — assigned at signup based on first 5 ratings.
   This is identity, not categorisation. Make it feel earned.
   ============================================================ */

export const TASTE_TRIBES = [
  { key: "ROMANTIC",       label: "THE ROMANTIC",       hint: "you cried at Past Lives. you'd cry again." },
  { key: "MIDNIGHTER",     label: "THE MIDNIGHT WATCHER", hint: "the weirder, the better. the louder, the better." },
  { key: "PATIENT",        label: "THE PATIENT ONE",    hint: "three-hour runtimes are a feature, not a bug." },
  { key: "POPCORN",        label: "THE POPCORN PURIST", hint: "give you a Friday, a sofa, and a sequel." },
  { key: "PURIST",         label: "THE PURIST",         hint: "you have opinions about aspect ratios." },
  { key: "FERAL",          label: "THE FERAL VIEWER",   hint: "you watch what catches you. tomorrow it'll be different." },
  { key: "SENTIMENTAL",    label: "THE SENTIMENTALIST", hint: "if it doesn't make you feel something, what's the point." },
] as const;

export type TasteTribeKey = typeof TASTE_TRIBES[number]["key"];

/** Assign a taste tribe based on the user's first ratings.
 *  Heuristic — vibes-based and proudly so. */
export function assignTasteTribe(rated: { rating: number; genres?: string[]; year?: number; runtime?: number }[]): typeof TASTE_TRIBES[number] {
  if (!rated || rated.length === 0) return TASTE_TRIBES[5]; // FERAL by default

  const longRuntimes = rated.filter((r) => (r.runtime ?? 0) >= 150).length;
  const allGenres = rated.flatMap((r) => r.genres ?? []).map((g) => g.toLowerCase());
  const has = (g: string) => allGenres.some((x) => x.includes(g));
  const highRated = rated.filter((r) => r.rating >= 8).length;
  const lowRated = rated.filter((r) => r.rating <= 4).length;

  if (longRuntimes >= 2) return TASTE_TRIBES[2]; // PATIENT
  if (has("romance") || has("drama")) return TASTE_TRIBES[0]; // ROMANTIC
  if (has("horror") || has("thriller")) return TASTE_TRIBES[1]; // MIDNIGHTER
  if (has("action") || has("comedy")) return TASTE_TRIBES[3]; // POPCORN
  if (lowRated >= 2) return TASTE_TRIBES[4]; // PURIST (harsh rater)
  if (highRated >= 4) return TASTE_TRIBES[6]; // SENTIMENTALIST (loves everything)
  return TASTE_TRIBES[5]; // FERAL
}

/* ============================================================
   INVITES — earned access. Unlocked after 3 interactions.
   3 interactions = (logs + posts + reactions + votes) >= 3
   1 invite per user for the first wave.
   ============================================================ */

export interface InviteCode {
  id: string;
  code: string;
  inviter_id: string;
  invitee_id: string | null;
  redeemed_at: string | null;
  created_at: string;
}

export function useInviteEligibility(userId: string | undefined) {
  const [interactions, setInteractions] = useState(0);
  const [code, setCode] = useState<InviteCode | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    // Count interactions across logs, posts, reactions, FOTW votes, poll votes, prompt answers
    const [logs, posts, reactions, fotwVotes, pollVotes, promptAnswers, existingCode] = await Promise.all([
      supabase.from("film_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("club_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("club_post_reactions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("club_film_of_week_votes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("club_poll_votes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("daily_prompt_answers").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("invite_codes").select("*").eq("inviter_id", userId).maybeSingle(),
    ]);

    const total =
      (logs.count ?? 0) +
      (posts.count ?? 0) +
      (reactions.count ?? 0) +
      (fotwVotes.count ?? 0) +
      (pollVotes.count ?? 0) +
      (promptAnswers.count ?? 0);

    setInteractions(total);
    setCode((existingCode.data as InviteCode | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const eligible = interactions >= 3;

  const generateCode = useCallback(async () => {
    if (!userId || !eligible || code) return;
    const newCode = Array.from({ length: 8 }, () =>
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]
    ).join("");
    const { data, error } = await supabase
      .from("invite_codes")
      .insert({ code: newCode, inviter_id: userId })
      .select()
      .single();
    if (!error && data) setCode(data as InviteCode);
    return data;
  }, [userId, eligible, code]);

  return { interactions, eligible, code, loading, generateCode, refresh: fetch };
}

/* ============================================================
   FOTW REVEAL — Sunday ritual.
   Returns the latest revealed winner for a club + whether the
   current user has already seen this week's reveal.
   ============================================================ */

export function useFotwReveal(clubId: string | undefined) {
  const [revealed, setRevealed] = useState<{
    week_start: string;
    nomination: FilmOfWeekNomination | null;
  } | null>(null);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      const { data } = await supabase
        .from("fotw_reveals")
        .select("week_start, winner_nomination_id, club_film_of_week_nominations(*)")
        .eq("club_id", clubId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRevealed({
          week_start: (data as any).week_start,
          nomination: (data as any).club_film_of_week_nominations ?? null,
        });
      }
    })();
  }, [clubId]);

  return revealed;
}
