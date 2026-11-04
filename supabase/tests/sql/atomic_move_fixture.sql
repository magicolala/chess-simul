-- PostgreSQL 17-only integration fixture for issue #55.
-- This schema is disposable: NEVER run these fixtures in Supabase production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE TABLE public.games (
  id uuid PRIMARY KEY,
  white_id uuid NOT NULL,
  black_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  fen text NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn text NOT NULL DEFAULT 'w' CHECK (turn IN ('w','b')),
  last_move_uci text,
  move_count integer NOT NULL DEFAULT 0,
  clocks jsonb,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT games_status_check CHECK (
    status IN ('waiting','active','checkmate','draw','resigned','aborted')
  )
);

CREATE TABLE public.moves (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  ply integer NOT NULL,
  uci text NOT NULL,
  san text,
  fen_after text NOT NULL,
  played_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, ply)
);

-- Mirror the existing production moves trigger: do NOT silently omit it.
CREATE OR REPLACE FUNCTION public.update_game_after_move()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $body$
BEGIN
  UPDATE public.games SET
    fen = NEW.fen_after,
    last_move_uci = NEW.uci,
    turn = CASE WHEN (NEW.ply % 2) = 0 THEN 'w' ELSE 'b' END,
    move_count = NEW.ply,
    updated_at = now()
  WHERE id = NEW.game_id;
  RETURN NEW;
END;
$body$;

CREATE TRIGGER trg_moves_update_game
  AFTER INSERT ON public.moves
  FOR EACH ROW EXECUTE FUNCTION public.update_game_after_move();

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games, public.moves TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
