-- ============================================================
-- FILM CLUB — Complete Database Setup
-- ============================================================
-- HOW TO RUN:
--   1. Go to supabase.com → your project → SQL Editor
--   2. Click "New query"
--   3. Paste this ENTIRE file
--   4. Click "Run" (or Cmd+Enter)
--   5. You should see "Success. No rows returned" — that means it worked
-- ============================================================

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text,
  favourite_film_tmdb_id int,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Public profiles are viewable by everyone') then
    create policy "Public profiles are viewable by everyone" on profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
  end if;
end $$;


-- ============================================
-- 2. CLUBS
-- ============================================
create table if not exists public.clubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tagline text default '',
  category text default 'GENERAL',
  cover_tmdb_backdrop text,
  accent_gradient text default 'linear-gradient(135deg, #FF4A4A, #1A1929)',
  created_by uuid references public.profiles(id),
  is_seeded boolean default false,
  created_at timestamptz default now()
);

-- Allow null created_by for seeded clubs
alter table public.clubs alter column created_by drop not null;

alter table public.clubs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'clubs' and policyname = 'Clubs are viewable by everyone') then
    create policy "Clubs are viewable by everyone" on clubs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'clubs' and policyname = 'Authenticated users can create clubs') then
    create policy "Authenticated users can create clubs" on clubs for insert with check (auth.uid() = created_by or created_by is null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'clubs' and policyname = 'Club creators can update their clubs') then
    create policy "Club creators can update their clubs" on clubs for update using (auth.uid() = created_by);
  end if;
end $$;


-- ============================================
-- 3. CLUB MEMBERSHIPS
-- ============================================
create table if not exists public.club_memberships (
  club_id uuid references public.clubs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (club_id, user_id)
);

alter table public.club_memberships enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'club_memberships' and policyname = 'Memberships are viewable by everyone') then
    create policy "Memberships are viewable by everyone" on club_memberships for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'club_memberships' and policyname = 'Users can join clubs') then
    create policy "Users can join clubs" on club_memberships for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'club_memberships' and policyname = 'Users can leave clubs') then
    create policy "Users can leave clubs" on club_memberships for delete using (auth.uid() = user_id);
  end if;
end $$;


-- ============================================
-- 4. FILM LOGS
-- ============================================
create table if not exists public.film_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  tmdb_id int not null,
  title text not null,
  poster_path text,
  backdrop_path text,
  rating numeric(3,1) check (rating >= 0 and rating <= 10),
  review_text text,
  is_rewatch boolean default false,
  has_spoilers boolean default false,
  watched_date date default current_date,
  genre_ids int[] default '{}',
  release_year int,
  created_at timestamptz default now()
);

alter table public.film_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'film_logs' and policyname = 'Logs are viewable by everyone') then
    create policy "Logs are viewable by everyone" on film_logs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'film_logs' and policyname = 'Users can create own logs') then
    create policy "Users can create own logs" on film_logs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'film_logs' and policyname = 'Users can update own logs') then
    create policy "Users can update own logs" on film_logs for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'film_logs' and policyname = 'Users can delete own logs') then
    create policy "Users can delete own logs" on film_logs for delete using (auth.uid() = user_id);
  end if;
end $$;


-- ============================================
-- 5. CLUB POSTS
-- ============================================
create table if not exists public.club_posts (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  log_id uuid references public.film_logs(id) on delete set null,
  body text,
  created_at timestamptz default now()
);

alter table public.club_posts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'club_posts' and policyname = 'Club posts viewable by everyone') then
    create policy "Club posts viewable by everyone" on club_posts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'club_posts' and policyname = 'Members can post to clubs they belong to') then
    create policy "Members can post to clubs they belong to" on club_posts for insert with check (
      auth.uid() = user_id
      and exists (
        select 1 from public.club_memberships
        where club_memberships.club_id = club_posts.club_id
        and club_memberships.user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'club_posts' and policyname = 'Users can delete own posts') then
    create policy "Users can delete own posts" on club_posts for delete using (auth.uid() = user_id);
  end if;
end $$;


-- ============================================
-- 5b. Add top_three column to profiles (safe to re-run)
-- ============================================
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'top_three_tmdb_ids'
  ) then
    alter table public.profiles add column top_three_tmdb_ids int[] default '{}';
  end if;
end $$;


-- ============================================
-- 6. VIEWS
-- ============================================

-- Club with member + post counts
create or replace view public.clubs_with_counts as
select
  c.*,
  coalesce(m.cnt, 0) as member_count,
  coalesce(p.cnt, 0) as post_count
from public.clubs c
left join (
  select club_id, count(*)::int as cnt from public.club_memberships group by club_id
) m on m.club_id = c.id
left join (
  select club_id, count(*)::int as cnt from public.club_posts group by club_id
) p on p.club_id = c.id;

-- Overlap alerts: films logged by multiple members of same club
create or replace view public.club_overlaps as
select
  cm.club_id,
  fl.tmdb_id,
  fl.title,
  fl.poster_path,
  count(distinct fl.user_id)::int as watchers,
  array_agg(distinct pr.username) as watcher_usernames,
  max(fl.created_at) as latest_log
from public.film_logs fl
join public.club_memberships cm on cm.user_id = fl.user_id
join public.profiles pr on pr.id = fl.user_id
group by cm.club_id, fl.tmdb_id, fl.title, fl.poster_path
having count(distinct fl.user_id) > 1;


-- ============================================
-- 7. INDEXES
-- ============================================
create index if not exists idx_film_logs_user on public.film_logs(user_id);
create index if not exists idx_film_logs_tmdb on public.film_logs(tmdb_id);
create index if not exists idx_club_posts_club on public.club_posts(club_id, created_at desc);
create index if not exists idx_club_memberships_user on public.club_memberships(user_id);


-- ============================================
-- 8. SEED: 5 starter clubs
-- First delete any old seeded clubs, then insert fresh
-- ============================================
delete from public.clubs where is_seeded = true;

insert into public.clubs (name, tagline, category, cover_tmdb_backdrop, accent_gradient, is_seeded)
values
  ('A24 Lovers', 'slow burns, loud silences, perfect casting', 'STUDIO',
   '/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg',
   'linear-gradient(135deg, #5BC2E7, #2A2645)', true),

  ('Rom-Com Obsessed', 'when harry met sally changed everything', 'GENRE',
   '/sGKgOeOnGaEjjE7QlgVFaBRDMHr.jpg',
   'linear-gradient(135deg, #FFB199, #9C3D6E)', true),

  ('Nolan Heads', 'time is a flat circle of IMAX tickets', 'DIRECTOR',
   '/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg',
   'linear-gradient(135deg, #9C7BFF, #1A1929)', true),

  ('90s Cinema', 'the decade that broke every rule', 'ERA',
   '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
   'linear-gradient(135deg, #FFB199, #3D1F5C)', true),

  ('International Films', 'cinema has no borders', 'CULTURE',
   '/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg',
   'linear-gradient(135deg, #2ECC71, #1A1929)', true);


-- ============================================
-- DONE! Your Film Club database is ready.
-- ============================================
