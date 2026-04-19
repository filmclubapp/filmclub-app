/* FILM CLUB — Film of the Week, Polls, Push Subscriptions
   Paste into Supabase SQL Editor and run.
*/

/* ---- Film of the Week: nominations ---- */
create table if not exists public.club_film_of_week_nominations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  week_start date not null,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  year integer,
  nominated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (club_id, week_start, tmdb_id)
);

create index if not exists club_fotw_nominations_club_week_idx
  on public.club_film_of_week_nominations (club_id, week_start);

/* ---- Film of the Week: votes (1 per user per week) ---- */
create table if not exists public.club_film_of_week_votes (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.club_film_of_week_nominations(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  week_start date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (club_id, week_start, user_id)
);

create index if not exists club_fotw_votes_nomination_idx
  on public.club_film_of_week_votes (nomination_id);

/* ---- Polls ---- */
create table if not exists public.club_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  question text not null,
  options jsonb not null,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists club_polls_club_idx
  on public.club_polls (club_id, created_at desc);

create table if not exists public.club_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.club_polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists club_poll_votes_poll_idx
  on public.club_poll_votes (poll_id);

/* ---- Push subscriptions ---- */
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

/* ---- RLS ---- */
alter table public.club_film_of_week_nominations enable row level security;
alter table public.club_film_of_week_votes enable row level security;
alter table public.club_polls enable row level security;
alter table public.club_poll_votes enable row level security;
alter table public.push_subscriptions enable row level security;

/* Drop policies first so re-running is safe */
drop policy if exists "fotw_nominations_select" on public.club_film_of_week_nominations;
drop policy if exists "fotw_nominations_insert" on public.club_film_of_week_nominations;
drop policy if exists "fotw_votes_select" on public.club_film_of_week_votes;
drop policy if exists "fotw_votes_insert" on public.club_film_of_week_votes;
drop policy if exists "fotw_votes_update" on public.club_film_of_week_votes;
drop policy if exists "fotw_votes_delete" on public.club_film_of_week_votes;
drop policy if exists "club_polls_select" on public.club_polls;
drop policy if exists "club_polls_insert" on public.club_polls;
drop policy if exists "club_poll_votes_select" on public.club_poll_votes;
drop policy if exists "club_poll_votes_insert" on public.club_poll_votes;
drop policy if exists "club_poll_votes_update" on public.club_poll_votes;
drop policy if exists "push_subs_select" on public.push_subscriptions;
drop policy if exists "push_subs_insert" on public.push_subscriptions;
drop policy if exists "push_subs_update" on public.push_subscriptions;
drop policy if exists "push_subs_delete" on public.push_subscriptions;

create policy "fotw_nominations_select" on public.club_film_of_week_nominations
  for select using (
    exists (
      select 1 from public.club_memberships m
      where m.club_id = club_film_of_week_nominations.club_id
        and m.user_id = auth.uid()
    )
  );

create policy "fotw_nominations_insert" on public.club_film_of_week_nominations
  for insert with check (
    nominated_by = auth.uid() and
    exists (
      select 1 from public.club_memberships m
      where m.club_id = club_film_of_week_nominations.club_id
        and m.user_id = auth.uid()
    )
  );

create policy "fotw_votes_select" on public.club_film_of_week_votes
  for select using (
    exists (
      select 1 from public.club_memberships m
      where m.club_id = club_film_of_week_votes.club_id
        and m.user_id = auth.uid()
    )
  );

create policy "fotw_votes_insert" on public.club_film_of_week_votes
  for insert with check (user_id = auth.uid());

create policy "fotw_votes_update" on public.club_film_of_week_votes
  for update using (user_id = auth.uid());

create policy "fotw_votes_delete" on public.club_film_of_week_votes
  for delete using (user_id = auth.uid());

create policy "club_polls_select" on public.club_polls
  for select using (
    exists (
      select 1 from public.club_memberships m
      where m.club_id = club_polls.club_id and m.user_id = auth.uid()
    )
  );

create policy "club_polls_insert" on public.club_polls
  for insert with check (
    created_by = auth.uid() and
    exists (
      select 1 from public.club_memberships m
      where m.club_id = club_polls.club_id and m.user_id = auth.uid()
    )
  );

create policy "club_poll_votes_select" on public.club_poll_votes
  for select using (
    exists (
      select 1
      from public.club_polls p
      join public.club_memberships m on m.club_id = p.club_id
      where p.id = club_poll_votes.poll_id and m.user_id = auth.uid()
    )
  );

create policy "club_poll_votes_insert" on public.club_poll_votes
  for insert with check (user_id = auth.uid());

create policy "club_poll_votes_update" on public.club_poll_votes
  for update using (user_id = auth.uid());

create policy "push_subs_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subs_insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subs_update" on public.push_subscriptions
  for update using (user_id = auth.uid());

create policy "push_subs_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());
