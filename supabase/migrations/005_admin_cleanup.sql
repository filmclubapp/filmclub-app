/* FILM CLUB — Admin cleanup
   Run in Supabase SQL Editor.
   Deletes Denis Villeneuve club and all related data.
*/

/* Delete Denis Villeneuve club (cascades to memberships, posts, etc.) */
DELETE FROM public.clubs
WHERE name ILIKE '%villeneuve%'
   OR name ILIKE '%denis%';

/* Verify — should return 0 rows */
SELECT id, name FROM public.clubs
WHERE name ILIKE '%villeneuve%'
   OR name ILIKE '%denis%';
