-- 20251229_hydra_tournaments.sql

-- Extend hydra_tournaments for new rules
ALTER TABLE public.hydra_tournaments
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS survival_lives_default INT;

-- Extend participants with elimination tracking
ALTER TABLE public.hydra_tournament_participants
  ADD COLUMN IF NOT EXISTS eliminated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS active_game_count INT DEFAULT 0 NOT NULL;

-- Extend hydra_match_queue with Elo window tracking
ALTER TABLE public.hydra_match_queue
  ADD COLUMN IF NOT EXISTS elo_min INT,
  ADD COLUMN IF NOT EXISTS elo_max INT,
  ADD COLUMN IF NOT EXISTS last_range_update_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.hydra_tournaments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS hydra_match_queue_tournament_id_idx ON public.hydra_match_queue (tournament_id);

-- Create hydra_games table
CREATE TABLE IF NOT EXISTS public.hydra_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.hydra_tournaments(id) ON DELETE CASCADE,
  white_player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  black_player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'finished', 'forfeited')) DEFAULT 'pending',
  result TEXT CHECK (result IN ('white_win', 'black_win', 'draw', 'forfeit')),
  time_control TEXT NOT NULL DEFAULT '5+3',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  last_move_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS hydra_games_tournament_id_idx ON public.hydra_games (tournament_id);
CREATE INDEX IF NOT EXISTS hydra_games_white_player_id_idx ON public.hydra_games (white_player_id);
CREATE INDEX IF NOT EXISTS hydra_games_black_player_id_idx ON public.hydra_games (black_player_id);
CREATE INDEX IF NOT EXISTS hydra_games_status_idx ON public.hydra_games (status);

-- Create hydra_game_pgn table
CREATE TABLE IF NOT EXISTS public.hydra_game_pgn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL UNIQUE REFERENCES public.hydra_games(id) ON DELETE CASCADE,
  pgn_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS hydra_game_pgn_game_id_idx ON public.hydra_game_pgn (game_id);

-- Create hydra_score_events table
CREATE TABLE IF NOT EXISTS public.hydra_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.hydra_tournaments(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.hydra_tournament_participants(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.hydra_games(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('win', 'draw', 'loss', 'forfeit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS hydra_score_events_tournament_id_idx ON public.hydra_score_events (tournament_id);
CREATE INDEX IF NOT EXISTS hydra_score_events_participant_id_idx ON public.hydra_score_events (participant_id);

-- Create hydra_matchmaking_events table
CREATE TABLE IF NOT EXISTS public.hydra_matchmaking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.hydra_tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_action TEXT NOT NULL CHECK (queue_action IN ('join', 'leave', 'match')),
  elo_min INT,
  elo_max INT,
  matched_game_id UUID REFERENCES public.hydra_games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS hydra_matchmaking_events_tournament_id_idx ON public.hydra_matchmaking_events (tournament_id);
CREATE INDEX IF NOT EXISTS hydra_matchmaking_events_player_id_idx ON public.hydra_matchmaking_events (player_id);

-- Realtime publication registration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hydra_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hydra_games;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hydra_score_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hydra_score_events;
  END IF;
END $$;
