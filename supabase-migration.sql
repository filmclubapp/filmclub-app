-- Run this once in Supabase → SQL Editor
-- Adds the columns needed for public profiles and sharing

alter table profiles
  add column if not exists username      text,
  add column if not exists member_number text,
  add column if not exists top_films     jsonb default '[]'::jsonb;

-- Index so /u/[username] lookups are fast
create index if not exists profiles_username_idx on profiles (username);

-- Allow anyone to read public profiles (no auth required for the public page)
create policy if not exists "Public profiles are viewable by anyone"
  on profiles for select
  using (true);
