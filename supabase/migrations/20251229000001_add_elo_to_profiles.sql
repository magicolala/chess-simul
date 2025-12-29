
-- 20251229000001_add_elo_to_profiles.sql

ALTER TABLE public.profiles
ADD COLUMN elo INT DEFAULT 1200 NOT NULL;

-- Optional: Create an index for the new elo column if it's frequently queried
CREATE INDEX profiles_elo_idx ON public.profiles (elo);

-- Down migration
-- ALTER TABLE public.profiles
-- DROP COLUMN elo;
