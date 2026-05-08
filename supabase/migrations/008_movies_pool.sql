-- ============================================================
-- Film Club — Curated Movies Pool
-- Phase 1 recommendation engine: no ML, pure taste + quality signals
-- IMDb/TMDB 7.0+ default, exceptions for comedy/horror/romance
--
-- category: easy | emotional | thriller | smart | comedy
-- tier:     S (must-recommend) | A (strong secondary) | B (niche)
-- club_tags: which Film Club clubs this film is most relevant to
-- ============================================================

create table if not exists movies (
  movie_id      integer primary key,
  title         text not null,
  genre_ids     integer[] default '{}',
  release_year  integer,
  vote_average  numeric default 0,
  popularity    numeric default 0,
  poster_path   text,          -- populated by TMDB fetch on first use
  overview      text,
  category      text not null, -- easy | emotional | thriller | smart | comedy
  tier          text not null default 'A', -- S | A | B
  club_tags     text[] default '{}',
  created_at    timestamptz default now()
);

alter table movies enable row level security;
create policy "movies_public_read" on movies for select using (true);

create index idx_movies_category on movies(category);
create index idx_movies_tier on movies(tier);
create index idx_movies_vote on movies(vote_average desc);

-- ============================================================
-- SEED: ~80 curated titles across 5 categories
-- Tier S = safe, great picks every time
-- Tier A = strong secondary picks
-- Tier B = niche/cult but valuable in right context
-- ============================================================

insert into movies (movie_id, title, genre_ids, release_year, vote_average, category, tier, club_tags) values

-- ── EASY / COMFORT ──────────────────────────────────────────
(154295, 'About Time',                ARRAY[18,10749],       2013, 7.8, 'easy',      'S', ARRAY['rom-com']),
(120467, 'The Grand Budapest Hotel',  ARRAY[35,18],          2014, 8.1, 'easy',      'S', ARRAY['artsy','a24']),
(13,     'Forrest Gump',              ARRAY[18,10749],       1994, 8.5, 'easy',      'S', ARRAY['comfort','emotional']),
(227164, 'Chef',                      ARRAY[35,18],          2014, 7.3, 'easy',      'A', ARRAY['comfort']),
(116745, 'The Secret Life of Walter Mitty', ARRAY[12,35,18], 2013, 7.3, 'easy',     'A', ARRAY['comfort']),
(489,    'Good Will Hunting',         ARRAY[18],             1997, 8.3, 'easy',      'S', ARRAY['emotional','smart']),
(129,    'Spirited Away',             ARRAY[16,10751,14],    2001, 8.5, 'easy',      'S', ARRAY['comfort']),
(862,    'Toy Story',                 ARRAY[16,10751,35],    1995, 8.0, 'easy',      'S', ARRAY['comfort']),
(10193,  'Up',                        ARRAY[16,10751,12],    2009, 8.0, 'easy',      'S', ARRAY['comfort','emotional']),
(523526, 'Mid90s',                    ARRAY[18],             2018, 7.3, 'easy',      'A', ARRAY['a24']),
(483689, 'Eighth Grade',              ARRAY[18],             2018, 7.3, 'easy',      'A', ARRAY['a24']),

-- ── EMOTIONAL / ROMANCE ─────────────────────────────────────
(927107, 'Past Lives',                ARRAY[18,10749],       2023, 7.9, 'emotional', 'S', ARRAY['a24','rom-com']),
(1058449,'Aftersun',                  ARRAY[18],             2022, 7.5, 'emotional', 'S', ARRAY['a24']),
(492188, 'Marriage Story',            ARRAY[18],             2019, 7.9, 'emotional', 'S', ARRAY['emotional']),
(38142,  'Eternal Sunshine of the Spotless Mind', ARRAY[18,878], 2004, 8.1, 'emotional', 'S', ARRAY['mind-blowing','rom-com']),
(313369, 'La La Land',               ARRAY[18,10749,10402], 2016, 8.0, 'emotional', 'S', ARRAY['rom-com']),
(98,     'Before Sunrise',            ARRAY[18,10749],       1995, 8.0, 'emotional', 'S', ARRAY['rom-com']),
(416477, 'Call Me By Your Name',      ARRAY[18,10749],       2017, 7.6, 'emotional', 'A', ARRAY['a24']),
(152601, 'Her',                       ARRAY[18,878],         2013, 8.0, 'emotional', 'S', ARRAY['sci-fi','mind-blowing']),
(209112, 'Boyhood',                   ARRAY[18],             2014, 7.9, 'emotional', 'S', ARRAY['emotional']),
(194,    'Amélie',                    ARRAY[18,10749,35],    2001, 8.0, 'emotional', 'S', ARRAY['rom-com']),
(19913,  '500 Days of Summer',        ARRAY[35,18,10749],    2009, 7.3, 'emotional', 'A', ARRAY['rom-com']),
(376867, 'Moonlight',                 ARRAY[18],             2016, 7.4, 'emotional', 'A', ARRAY['a24']),
(391713, 'Lady Bird',                 ARRAY[18],             2017, 7.4, 'emotional', 'A', ARRAY['a24']),
(264644, 'Brooklyn',                  ARRAY[18,10749],       2015, 7.3, 'emotional', 'A', ARRAY['rom-com']),
(331482, 'Little Women',              ARRAY[18,10749],       2019, 7.8, 'emotional', 'A', ARRAY['rom-com']),
(153,    'Lost in Translation',       ARRAY[18,10749],       2003, 7.7, 'emotional', 'A', ARRAY['emotional']),
(400535, 'The Florida Project',       ARRAY[18],             2017, 7.6, 'emotional', 'A', ARRAY['a24']),
(615182, 'Portrait of a Lady on Fire',ARRAY[18,10749],       2019, 8.1, 'emotional', 'S', ARRAY['a24','rom-com']),
(116711, 'Silver Linings Playbook',   ARRAY[35,18,10749],    2012, 7.7, 'emotional', 'A', ARRAY['rom-com']),
(4951,   '10 Things I Hate About You',ARRAY[35,18,10749],    1999, 7.3, 'comedy',    'A', ARRAY['rom-com']),
(405882, 'A Ghost Story',             ARRAY[18],             2017, 6.8, 'emotional', 'B', ARRAY['a24']),

-- ── THRILLER / CRIME ────────────────────────────────────────
(146233, 'Prisoners',                 ARRAY[18,53,9648],     2013, 8.1, 'thriller',  'S', ARRAY['thriller','nolan']),
(242582, 'Nightcrawler',              ARRAY[18,53,80],       2014, 7.9, 'thriller',  'S', ARRAY['thriller']),
(210577, 'Gone Girl',                 ARRAY[18,9648,53],     2014, 8.1, 'thriller',  'S', ARRAY['thriller']),
(546554, 'Knives Out',                ARRAY[35,80,9648],     2019, 7.9, 'thriller',  'S', ARRAY['thriller']),
(496243, 'Parasite',                  ARRAY[35,53,18],       2019, 8.5, 'thriller',  'S', ARRAY['a24','thriller']),
(419430, 'Get Out',                   ARRAY[27,53,9648],     2017, 7.7, 'thriller',  'S', ARRAY['thriller','a24']),
(6966,   'No Country for Old Men',    ARRAY[80,18,53],       2007, 8.2, 'thriller',  'S', ARRAY['thriller']),
(807,    'Se7en',                     ARRAY[18,9648,80],     1995, 8.6, 'thriller',  'S', ARRAY['thriller']),
(273481, 'Sicario',                   ARRAY[18,53],          2015, 7.6, 'thriller',  'A', ARRAY['thriller','a24']),
(82702,  'Drive',                     ARRAY[18,80],          2011, 7.8, 'thriller',  'A', ARRAY['thriller']),
(550,    'Fight Club',                ARRAY[18],             1999, 8.4, 'thriller',  'S', ARRAY['thriller','smart']),
(508,    'Zodiac',                    ARRAY[18,9648,80],     2007, 7.7, 'thriller',  'A', ARRAY['thriller']),
(680,    'Pulp Fiction',              ARRAY[53,80],          1994, 8.5, 'thriller',  'S', ARRAY['thriller','smart']),
(278,    'The Shawshank Redemption',  ARRAY[18,80],          1994, 8.7, 'easy',      'S', ARRAY['smart','comfort']),
(769,    'GoodFellas',                ARRAY[18,80],          1990, 8.5, 'thriller',  'S', ARRAY['thriller','smart']),
(493922, 'Hereditary',                ARRAY[18,27],          2018, 7.3, 'thriller',  'A', ARRAY['a24']),
(530385, 'Midsommar',                 ARRAY[18,27],          2019, 7.1, 'thriller',  'B', ARRAY['a24']),
(600354, 'The Lighthouse',            ARRAY[18,9648],        2019, 7.4, 'thriller',  'A', ARRAY['a24']),
(475557, 'Joker',                     ARRAY[18,80,53],       2019, 8.2, 'thriller',  'S', ARRAY['thriller']),
(473033, 'Uncut Gems',                ARRAY[18,80,53],       2019, 7.4, 'thriller',  'A', ARRAY['thriller']),
(296096, 'The Nice Guys',             ARRAY[28,35,18],       2016, 7.4, 'comedy',    'A', ARRAY['thriller','funny']),

-- ── SMART / SCI-FI / PRESTIGE ───────────────────────────────
(329865, 'Arrival',                   ARRAY[18,878,9648],    2016, 7.9, 'smart',     'S', ARRAY['sci-fi','mind-blowing']),
(264660, 'Ex Machina',                ARRAY[18,53,878],      2014, 7.7, 'smart',     'S', ARRAY['sci-fi','mind-blowing']),
(37799,  'The Social Network',        ARRAY[18],             2010, 7.8, 'smart',     'S', ARRAY['smart']),
(157336, 'Interstellar',              ARRAY[18,878],         2014, 8.4, 'smart',     'S', ARRAY['sci-fi','nolan','mind-blowing']),
(27205,  'Inception',                 ARRAY[28,878,18],      2010, 8.4, 'smart',     'S', ARRAY['sci-fi','nolan','mind-blowing']),
(244786, 'Whiplash',                  ARRAY[18,10402],       2014, 8.5, 'smart',     'S', ARRAY['a24','smart']),
(37165,  'The Truman Show',           ARRAY[35,18],          1998, 8.1, 'smart',     'S', ARRAY['mind-blowing','smart']),
(335984, 'Blade Runner 2049',         ARRAY[18,878],         2017, 7.5, 'smart',     'A', ARRAY['sci-fi','mind-blowing']),
(1124,   'The Prestige',              ARRAY[18,9648],        2006, 8.5, 'smart',     'S', ARRAY['nolan','mind-blowing']),
(374720, 'Dunkirk',                   ARRAY[18,10752],       2017, 7.9, 'smart',     'A', ARRAY['nolan']),
(530915, '1917',                      ARRAY[18,10752],       2019, 8.0, 'smart',     'S', ARRAY['smart']),
(485811, 'The Favourite',             ARRAY[18],             2018, 7.3, 'smart',     'A', ARRAY['a24']),
(577975, 'The Farewell',              ARRAY[18],             2019, 7.5, 'emotional', 'A', ARRAY['a24']),
(155,    'The Dark Knight',           ARRAY[28,80,18,53],    2008, 9.0, 'smart',     'S', ARRAY['nolan','smart']),
(62,     '2001: A Space Odyssey',     ARRAY[878,9648],       1968, 8.3, 'smart',     'A', ARRAY['sci-fi','mind-blowing']),
(11324,  'Shutter Island',            ARRAY[18,9648,53],     2010, 8.1, 'thriller',  'S', ARRAY['thriller','mind-blowing']),

-- ── COMEDY / FUN ────────────────────────────────────────────
(601666, 'Palm Springs',              ARRAY[35,10749,878],   2020, 7.4, 'comedy',    'S', ARRAY['rom-com','funny']),
(8363,   'Superbad',                  ARRAY[35,18],          2007, 7.6, 'comedy',    'A', ARRAY['funny']),
(37735,  'Bridesmaids',               ARRAY[35,10749],       2011, 6.8, 'comedy',    'A', ARRAY['funny','rom-com']),
(469172, 'Game Night',                ARRAY[35,18],          2018, 7.1, 'comedy',    'A', ARRAY['funny']),
(537915, 'Booksmart',                 ARRAY[35,18],          2019, 7.2, 'comedy',    'A', ARRAY['funny','a24']),
(324857, 'Spider-Man: Into the Spider-Verse', ARRAY[28,12,16], 2018, 8.4, 'comedy', 'S', ARRAY['funny','smart']),
(420818, 'The Lost City',             ARRAY[28,35,10749],    2022, 6.8, 'comedy',    'B', ARRAY['funny','rom-com']),
(508439, 'Good Boys',                 ARRAY[35,18],          2019, 7.0, 'comedy',    'A', ARRAY['funny']),
(454626, 'Sonic the Hedgehog',        ARRAY[28,35,16,10751], 2020, 6.5, 'easy',      'B', ARRAY['comfort']),
(559969, 'Hustlers',                  ARRAY[18,35,80],       2019, 7.0, 'comedy',    'A', ARRAY['funny','a24'])

on conflict (movie_id) do nothing;
