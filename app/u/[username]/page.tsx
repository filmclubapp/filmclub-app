import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PublicCard from "./PublicCard";

/* ── Supabase server client (read-only, anon key) ── */
function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/* ── Profile shape from DB ── */
export interface PublicProfile {
  username:      string;
  taste_tribe:   string;
  member_number: string;
  top_films:     { title: string; year: string; posterPath: string | null; tmdbId: number | null }[];
}

/* ── OG / Twitter meta ── */
export async function generateMetadata(
  { params }: { params: { username: string } }
): Promise<Metadata> {
  const username = decodeURIComponent(params.username);
  const supabase = serverSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("username, taste_tribe, member_number")
    .eq("username", username)
    .single();

  if (!data) {
    return { title: "Film Club" };
  }

  const archetype = data.taste_tribe?.replace(/-/g, " ").toUpperCase() ?? "FILM CLUB MEMBER";
  const title = `${data.username} · ${archetype} · Film Club`;
  const description = `${data.member_number} · Founding member. Discover your own cinematic identity at filmclub.com`;
  const ogImage = `/api/og?username=${encodeURIComponent(username)}&archetype=${encodeURIComponent(archetype)}&member=${encodeURIComponent(data.member_number ?? "")}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "profile",
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [ogImage],
    },
  };
}

/* ── Page ── */
export default async function ProfilePage(
  { params }: { params: { username: string } }
) {
  const username = decodeURIComponent(params.username);
  const supabase = serverSupabase();

  const { data } = await supabase
    .from("profiles")
    .select("username, taste_tribe, member_number, top_films")
    .eq("username", username)
    .single();

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0c16", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", color: "rgba(232,228,212,0.3)", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Member not found
        </p>
      </div>
    );
  }

  const profile: PublicProfile = {
    username:      data.username ?? username,
    taste_tribe:   data.taste_tribe ?? "",
    member_number: data.member_number ?? "",
    top_films:     Array.isArray(data.top_films) ? data.top_films : [],
  };

  return <PublicCard profile={profile} />;
}
