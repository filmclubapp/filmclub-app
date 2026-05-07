-- ============================================================
-- Film Club — User Actions
-- Tracks save / watched / skip / feedback per film
-- Powers the feedback loop for recommendation improvement
-- ============================================================

create table if not exists user_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade not null,
  movie_id   integer not null,
  action     text not null,
  -- action values:
  --   save         → added to watchlist
  --   watched      → marked as watched (quick log, no full review)
  --   skip         → explicitly skipped / not interested
  --   perfect_pick → post-watch: "that was exactly right"
  --   good         → post-watch: "good not great"
  --   miss         → post-watch: "missed badly"
  created_at timestamptz default now()
);

alter table user_actions enable row level security;

-- Users can read and write their own actions
create policy "user_actions_select_own" on user_actions
  for select using (auth.uid() = user_id);

create policy "user_actions_insert_own" on user_actions
  for insert with check (auth.uid() = user_id);

create policy "user_actions_delete_own" on user_actions
  for delete using (auth.uid() = user_id);

-- Indexes for recommendation engine queries
create index idx_user_actions_user_movie on user_actions(user_id, movie_id);
create index idx_user_actions_action     on user_actions(action);
create index idx_user_actions_created    on user_actions(created_at desc);

-- ============================================================
-- Nightly recommendations cache (one set per user per day)
-- ============================================================

create table if not exists nightly_recommendations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade not null,
  movie_id   integer not null,
  score      numeric,
  reason     text,
  mood_used  text,
  shown_at   timestamptz default now(),
  clicked    boolean default false,
  feedback   text  -- perfect_pick | good | miss
);

alter table nightly_recommendations enable row level security;

create policy "nightly_recs_own" on nightly_recommendations
  for all using (auth.uid() = user_id);

create index idx_nightly_recs_user on nightly_recommendations(user_id, shown_at desc);
