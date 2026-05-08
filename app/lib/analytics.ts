/* ============================================================
   ANALYTICS — PostHog wrapper
   ============================================================
   Thin wrapper so the rest of the app imports `track()` from
   one place. If PostHog isn't loaded yet, events are silently
   dropped — no crashes in dev or SSR.

   ── Setup ──
   1. npm install posthog-js
   2. Add NEXT_PUBLIC_POSTHOG_KEY to .env.local
   3. Add NEXT_PUBLIC_POSTHOG_HOST (defaults to https://us.i.posthog.com)
   4. Wrap app in <PostHogProvider> (see PostHogProvider.tsx)

   ── 10 Core Events ──
   film_logged        — user logs a film
   post_created       — user posts in a club
   reaction_added     — user reacts to a post
   prompt_answered    — user answers the daily prompt
   club_joined        — user joins a club
   invite_generated   — user generates an invite code
   invite_redeemed    — new user signs up via invite code
   poll_voted         — user votes on a club poll
   fotw_nominated     — user nominates for Film of the Week
   share_tapped       — user taps any share/copy button
   ============================================================ */

import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (initialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY not set — tracking disabled");
    return;
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "memory", // privacy-friendly, no cookies
    loaded: () => {
      initialized = true;
    },
  });
}

/** Identify user after login */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(userId, properties);
  } catch {
    // PostHog not loaded
  }
}

/** Reset on logout */
export function resetUser() {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {
    // PostHog not loaded
  }
}

/** Track an event — safe to call even if PostHog isn't loaded */
export function track(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, properties);
  } catch {
    // PostHog not loaded — silently drop
  }
}

/* ── Typed helpers for the 10 core events ──────────────────── */

export const analytics = {
  filmLogged: (p: { tmdb_id: number; title: string; rating?: number }) =>
    track("film_logged", p),

  postCreated: (p: { club_id: string; has_film?: boolean }) =>
    track("post_created", p),

  reactionAdded: (p: { post_id: string; type: string }) =>
    track("reaction_added", p),

  promptAnswered: (p: { prompt_id: string }) =>
    track("prompt_answered", p),

  clubJoined: (p: { club_id: string; club_name: string }) =>
    track("club_joined", p),

  inviteGenerated: (p: { code: string }) =>
    track("invite_generated", p),

  inviteRedeemed: (p: { code: string; inviter_id: string }) =>
    track("invite_redeemed", p),

  pollVoted: (p: { poll_id: string; option: string }) =>
    track("poll_voted", p),

  fotwNominated: (p: { club_id: string; tmdb_id: number }) =>
    track("fotw_nominated", p),

  shareTapped: (p: { item: string; method?: string }) =>
    track("share_tapped", p),
};
