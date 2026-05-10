-- ============================================================
-- 010_waitlist.sql
-- Waitlist table for Film Club Wave 01 pre-launch sign-ups.
-- No auth account is created — just email + identity info.
-- Duplicate emails are handled by upsert on conflict.
-- ============================================================

create table if not exists public.waitlist (
  id            uuid        default gen_random_uuid() primary key,
  email         text        not null unique,
  username      text,
  archetype_id  text,
  member_number text,
  top_films     jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.waitlist enable row level security;

-- Anyone (anon or authenticated) can add themselves
create policy "anyone_can_join_waitlist"
  on public.waitlist
  for insert
  with check (true);

-- Allow updates (required for upsert on conflict)
create policy "anyone_can_update_waitlist"
  on public.waitlist
  for update
  using (true)
  with check (true);

-- Allow select so we can count rows for member numbers
create policy "anyone_can_read_waitlist_count"
  on public.waitlist
  for select
  using (true);
