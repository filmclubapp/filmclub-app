-- 004: Seed 14 days of daily prompts starting tomorrow
-- Run in Supabase SQL Editor after 003_activation_blueprint.sql

INSERT INTO daily_prompts (prompt_date, question) VALUES
  (CURRENT_DATE,       'What film do you quote constantly but have never rewatched?'),
  (CURRENT_DATE + 1,   'A movie everyone loves that you think is massively overrated.'),
  (CURRENT_DATE + 2,   'The last film that genuinely surprised you. What did you expect?'),
  (CURRENT_DATE + 3,   'A director''s worst film — and why you still watched it.'),
  (CURRENT_DATE + 4,   'Pick a film to describe your current mood. Just the title.'),
  (CURRENT_DATE + 5,   'What''s the most underrated performance you''ve ever seen?'),
  (CURRENT_DATE + 6,   'A film you watched alone that you wish you''d seen with someone.'),
  (CURRENT_DATE + 7,   'The movie that made you cry when you absolutely did not expect to.'),
  (CURRENT_DATE + 8,   'If you had to show one film to someone who hates cinema, what is it?'),
  (CURRENT_DATE + 9,   'A sequel that''s genuinely better than the original. Defend it.'),
  (CURRENT_DATE + 10,  'What film do you think aged the worst? Why?'),
  (CURRENT_DATE + 11,  'The film you''ve recommended the most — and has anyone actually watched it?'),
  (CURRENT_DATE + 12,  'A movie that changed how you see a real place, person, or time in history.'),
  (CURRENT_DATE + 13,  'Last film you rated 5 stars. Would you rate it the same today?')
ON CONFLICT (prompt_date) DO UPDATE SET question = EXCLUDED.question;
