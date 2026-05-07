-- ─────────────────────────────────────────────────────────────────────────────
-- 007_profiles_moods.sql
-- Adds a moods array to profiles, populated during onboarding Step 3.
-- Used by Tonight For You to filter TMDB trending to the user's vibe.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists moods text[] default '{}';

-- Index for quick filtering (PostgREST does GIN index lookups for @> operator)
create index if not exists idx_profiles_moods on public.profiles using gin (moods);
