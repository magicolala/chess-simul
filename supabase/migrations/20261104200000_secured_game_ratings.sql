-- Issue #63: server-authorized, exactly-once standard game Elo settlement.
-- Scope: public.games only (NOT Hydra's independent hydra_games ledger).
-- Historical games are NOT automatically authorized or re-rated.
--
-- Security: users currently had table-wide INSERT/UPDATE on profiles, so
-- RLS allowed them to supply arbitrary elo values for their own profiles.
-- Revoke table grants and give back ONLY editable profile fields.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, username, avatar_url, bio, onboarding_completed)
  ON TABLE public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url, bio, onboarding_completed)
  ON TABLE public.profiles TO authenticated;

-- A game becomes rated only when a trusted server route explicitly records
-- its provenance. Default client-created games are NEVER rated.
CREATE TABLE IF NOT EXISTS public.rated_game_authorizations (
  game_id uuid PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('accepted_invite', 'trusted_matchmaking')),
  source_invite_id uuid UNIQUE REFERENCES public.invites(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rated_game_authorization_origin CHECK (
    (source = 'accepted_invite' AND source_invite_id IS NOT NULL)
    OR (source = 'trusted_matchmaking' AND source_invite_id IS NULL)
  )
);

-- Durable idempotency ledger. Unique game_id prevents repeated Elo awards;
-- retaining the audit event also prevents deleting a settled game and
-- replaying its result for a second award.
CREATE TABLE IF NOT EXISTS public.game_rating_events (
  game_id uuid PRIMARY KEY REFERENCES public.games(id) ON DELETE RESTRICT,
  white_id uuid NOT NULL REFERENCES public.profiles(id),
  black_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL CHECK (status IN ('checkmate', 'draw', 'resigned', 'timeout')),
  winner_id uuid REFERENCES public.profiles(id),
  white_elo_before integer NOT NULL,
  white_delta integer NOT NULL,
  white_elo_after integer NOT NULL,
  black_elo_before integer NOT NULL,
  black_delta integer NOT NULL,
  black_elo_after integer NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT rating_event_players_different CHECK (white_id <> black_id),
  CONSTRAINT rating_event_winner_valid CHECK (
    (status = 'draw' AND winner_id IS NULL)
    OR (status <> 'draw' AND winner_id IN (white_id, black_id))
  )
);
CREATE INDEX IF NOT EXISTS game_rating_events_white_idx
  ON public.game_rating_events (white_id);
CREATE INDEX IF NOT EXISTS game_rating_events_black_idx
  ON public.game_rating_events (black_id);

ALTER TABLE public.rated_game_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rating_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rated_game_authorizations, public.game_rating_events
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.rated_game_authorizations
  TO service_role;
GRANT SELECT, INSERT ON TABLE public.game_rating_events
  TO service_role;

-- The caller must already have a verified user JWT in the Edge Function.
-- This RPC is intentionally SECURITY INVOKER and callable by service_role
-- ONLY; it derives the outcome and game mode from locked database rows.
CREATE OR REPLACE FUNCTION public.apply_completed_game_rating(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_game public.games%ROWTYPE;
  v_authorized boolean;
  v_already_processed boolean;
  v_white_elo integer;
  v_black_elo integer;
  v_white_games bigint;
  v_black_games bigint;
  v_white_k integer;
  v_black_k integer;
  v_white_score numeric;
  v_expected_white numeric;
  v_white_delta integer;
  v_black_delta integer;
BEGIN
  IF p_game_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_game_id');
  END IF;

  -- Lock the game first: competing requests for the same game serialize.
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'game_not_found');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.game_rating_events WHERE game_id=p_game_id)
    INTO v_already_processed;
  IF v_already_processed THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.rated_game_authorizations WHERE game_id=p_game_id)
    INTO v_authorized;
  IF NOT v_authorized OR v_game.game_mode IS DISTINCT FROM 'standard'
      OR v_game.simul_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_rated');
  END IF;

  IF v_game.status NOT IN ('checkmate', 'draw', 'resigned', 'timeout') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_finished');
  END IF;
  IF v_game.white_id = v_game.black_id
      OR (v_game.status = 'draw' AND v_game.winner_id IS NOT NULL)
      OR (v_game.status <> 'draw'
          AND (v_game.winner_id IS NULL
               OR v_game.winner_id NOT IN (v_game.white_id, v_game.black_id))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_outcome');
  END IF;

  -- Always acquire both profile locks in a stable order. Separate games
  -- sharing a player will serialize, so simultaneous settlements neither
  -- lose rating updates nor use stale Elo / provisional game counts.
  PERFORM 1 FROM public.profiles
  WHERE id IN (v_game.white_id, v_game.black_id)
  ORDER BY id FOR UPDATE;
  SELECT elo INTO v_white_elo FROM public.profiles WHERE id=v_game.white_id;
  SELECT elo INTO v_black_elo FROM public.profiles WHERE id=v_game.black_id;
  IF v_white_elo IS NULL OR v_black_elo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_profile');
  END IF;

  SELECT count(*) INTO v_white_games
    FROM public.game_rating_events
    WHERE white_id=v_game.white_id OR black_id=v_game.white_id;
  SELECT count(*) INTO v_black_games
    FROM public.game_rating_events
    WHERE white_id=v_game.black_id OR black_id=v_game.black_id;

  -- Existing Elo policy in elo.ts with the fallback adult age (30):
  -- K=40 for the first 30 rated games; K=10 at Elo>=2400; else K=20.
  v_white_k := CASE WHEN v_white_games < 30 THEN 40
    WHEN v_white_elo >= 2400 THEN 10 ELSE 20 END;
  v_black_k := CASE WHEN v_black_games < 30 THEN 40
    WHEN v_black_elo >= 2400 THEN 10 ELSE 20 END;
  v_white_score := CASE WHEN v_game.status='draw' THEN 0.5
    WHEN v_game.winner_id=v_game.white_id THEN 1 ELSE 0 END;

  v_expected_white := 1 / (1 + power(10::numeric,
    (v_black_elo-v_white_elo)::numeric / 400));
  -- floor(x + 0.5) matches JS Math.round for negative deltas as well.
  v_white_delta := floor(v_white_k * (v_white_score-v_expected_white) + 0.5)::integer;
  v_black_delta := floor(v_black_k * ((1-v_white_score)-(1-v_expected_white)) + 0.5)::integer;

  UPDATE public.profiles SET elo=v_white_elo+v_white_delta WHERE id=v_game.white_id;
  UPDATE public.profiles SET elo=v_black_elo+v_black_delta WHERE id=v_game.black_id;

  INSERT INTO public.game_rating_events (
    game_id,white_id,black_id,status,winner_id,
    white_elo_before,white_delta,white_elo_after,
    black_elo_before,black_delta,black_elo_after
  ) VALUES (
    v_game.id,v_game.white_id,v_game.black_id,v_game.status,v_game.winner_id,
    v_white_elo,v_white_delta,v_white_elo+v_white_delta,
    v_black_elo,v_black_delta,v_black_elo+v_black_delta
  );

  RETURN jsonb_build_object(
    'ok', true, 'already_processed', false, 'game_id',v_game.id,
    'white_delta',v_white_delta,'black_delta',v_black_delta,
    'white_elo',v_white_elo+v_white_delta,
    'black_elo',v_black_elo+v_black_delta
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_completed_game_rating(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_completed_game_rating(uuid)
  TO service_role;

-- Only service-role (or the DB owner) may transition the status of a game
-- under the current RLS policy. A trusted terminal transition is the right
-- place to settle authorized Elo, in the SAME transaction as game completion.
-- Never call an Edge Function from a trigger or trust a result in a request.
CREATE OR REPLACE FUNCTION public.settle_rating_after_game_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $trigger$
BEGIN
  IF NEW.status IN ('checkmate', 'draw', 'resigned', 'timeout')
      AND (
        OLD.status IS DISTINCT FROM NEW.status
        OR OLD.winner_id IS DISTINCT FROM NEW.winner_id
      ) THEN
    PERFORM public.apply_completed_game_rating(NEW.id);
  END IF;
  RETURN NEW;
END;
$trigger$;

REVOKE ALL ON FUNCTION public.settle_rating_after_game_finish()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_rating_after_game_finish()
  TO service_role;

DROP TRIGGER IF EXISTS trg_settle_rating_after_game_finish ON public.games;
CREATE TRIGGER trg_settle_rating_after_game_finish
  AFTER UPDATE OF status, winner_id ON public.games
  FOR EACH ROW
  WHEN (
    NEW.status IN ('checkmate', 'draw', 'resigned', 'timeout')
    AND (
      OLD.status IS DISTINCT FROM NEW.status
      OR OLD.winner_id IS DISTINCT FROM NEW.winner_id
    )
  )
  EXECUTE FUNCTION public.settle_rating_after_game_finish();
