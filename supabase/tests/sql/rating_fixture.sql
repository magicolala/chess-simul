-- Disposable PostgreSQL 17 schema for secured Elo settlement (#63).
-- Match the relevant real Supabase tables / columns and the *old* broad
-- authenticated privileges so our migration catches the self-Elo exploit.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
-- Supabase service_role has BYPASSRLS; the local fixture must mirror that.
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  elo integer NOT NULL DEFAULT 1200,
  onboarding_completed boolean NOT NULL DEFAULT false
);
CREATE TABLE public.invites (
  id uuid PRIMARY KEY,
  from_user uuid NOT NULL REFERENCES public.profiles(id),
  to_user uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending'
);
CREATE TABLE public.games (
  id uuid PRIMARY KEY,
  simul_id uuid,
  white_id uuid NOT NULL REFERENCES public.profiles(id),
  black_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL,
  winner_id uuid REFERENCES public.profiles(id),
  game_mode text NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT games_status_check CHECK (
    status IN ('waiting','active','checkmate','draw','resigned','timeout','aborted')
  )
);

-- Mirrors pre-existing Supabase default grants, which are overbroad.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.games TO service_role;
