/* FILM CLUB — Activation Blueprint
   Daily prompts, taste tribes, invite codes, FOTW reveal tracking.
   Run after 002_fotw_polls_push.sql
   Safe to re-run: uses IF NOT EXISTS + DROP POLICY IF EXISTS.
*/

/* ---- Daily Prompts ---- */
create table if not exists public.daily_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_date date not null unique,
  question text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_prompt_answers (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.daily_prompts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (prompt_id, user_id)
);

create index if not exists daily_prompt_answers_prompt_idx
  on public.daily_prompt_answers (prompt_id, created_at desc);

/* ---- Taste Tribes: add column to profiles ---- */
alter table public.profiles
  add column if not exists taste_tribe text;

/* ---- Invite Codes ---- */
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invite_codes_inviter_idx
  on public.invite_codes (inviter_id);

/* ---- FOTW Reveal tracking ---- */
create table if not exists public.fotw_reveals (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  week_start date not null,
  winner_nomination_id uuid references public.club_film_of_week_nominations(id) on delete set null,
  revealed_at timestamptz not null default now(),
  unique (club_id, week_start)
);

/* ---- RLS ---- */
alter table public.daily_prompts enable row level security;
alter table public.daily_prompt_answers enable row level security;
alter table public.invite_codes enable row level security;
alter table public.fotw_reveals enable row level security;

/* Drop policies first so re-running is safe */
drop policy if exists "daily_prompts_select" on public.daily_prompts;
drop policy if exists "daily_prompts_insert" on public.daily_prompts;
drop policy if exists "daily_prompt_answers_select" on public.daily_prompt_answers;
drop policy if exists "daily_prompt_answers_insert" on public.daily_prompt_answers;
drop policy if exists "daily_prompt_answers_update" on public.daily_prompt_answers;
drop policy if exists "invite_codes_select_own" on public.invite_codes;
drop policy if exists "invite_codes_insert" on public.invite_codes;
drop policy if exists "invite_codes_update_redeem" on public.invite_codes;
drop policy if exists "fotw_reveals_select" on public.fotw_reveals;

create policy "daily_prompts_select" on public.daily_prompts
  for select using (auth.uid() is not null);

create policy "daily_prompt_answers_select" on public.daily_prompt_answers
  for select using (auth.uid() is not null);

create policy "daily_prompt_answers_insert" on public.daily_prompt_answers
  for insert with check (user_id = auth.uid());

create policy "daily_prompt_answers_update" on public.daily_prompt_answers
  for update using (user_id = auth.uid());

create policy "invite_codes_select_own" on public.invite_codes
  for select using (inviter_id = auth.uid() or invitee_id = auth.uid());

create policy "invite_codes_insert" on public.invite_codes
  for insert with check (inviter_id = auth.uid());

create policy "invite_codes_update_redeem" on public.invite_codes
  for update using (true);

create policy "fotw_reveals_select" on public.fotw_reveals
  for select using (
    exists (
      select 1 from public.club_memberships m
      where m.club_id = fotw_reveals.club_id and m.user_id = auth.uid()
    )
  );

/* ---- Seed: today's prompt ---- */
insert into public.daily_prompts (prompt_date, question)
values (current_date, 'What film do you quote constantly but have never rewatched?')
on conflict (prompt_date) do nothing;
