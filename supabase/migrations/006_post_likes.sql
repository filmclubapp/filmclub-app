-- ─────────────────────────────────────────────────────────────────────────────
-- 006_post_likes.sql
-- Adds likes to club posts — powers the engagement-sorted feed and
-- the optimistic like button on FeedCard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. post_likes table ───────────────────────────────────────────────────────
create table if not exists public.post_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  post_id    uuid references public.club_posts(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  -- One like per user per post
  constraint post_likes_user_post_unique unique (user_id, post_id)
);

-- ── 2. Row-level security ─────────────────────────────────────────────────────
alter table public.post_likes enable row level security;

-- Anyone (including anonymous) can read likes counts
create policy "Likes are publicly visible"
  on post_likes for select using (true);

-- Authenticated users can like posts
create policy "Authenticated users can like posts"
  on post_likes for insert
  with check (auth.uid() = user_id);

-- Users can only unlike their own likes
create policy "Users can unlike their own likes"
  on post_likes for delete
  using (auth.uid() = user_id);

-- ── 3. Performance indexes ────────────────────────────────────────────────────
-- Fast lookup: "has this user liked this post?" (optimistic UI toggle check)
create index if not exists idx_post_likes_user_post
  on public.post_likes (user_id, post_id);

-- Fast aggregation: count likes per post (feed ranking)
create index if not exists idx_post_likes_post_id
  on public.post_likes (post_id);

-- ── 4. likes_count column on club_posts ───────────────────────────────────────
-- Denormalised count for fast feed ordering without a subquery.
-- Updated via trigger below so it never drifts out of sync.
alter table public.club_posts
  add column if not exists likes_count int not null default 0;

-- ── 5. Trigger to keep likes_count in sync ────────────────────────────────────
create or replace function public.update_post_likes_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.club_posts
    set likes_count = likes_count + 1
    where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.club_posts
    set likes_count = greatest(likes_count - 1, 0)
    where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_likes_count on public.post_likes;

create trigger trg_post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.update_post_likes_count();

-- ── 6. Engagement-sorted feed index ──────────────────────────────────────────
-- Supports the ORDER BY used in useHomeFeed for the social feed:
--   order by (likes_count * 2 + recency_decay) desc
-- A partial index on (club_id, likes_count desc, created_at desc) is sufficient.
create index if not exists idx_club_posts_engagement
  on public.club_posts (club_id, likes_count desc, created_at desc);
