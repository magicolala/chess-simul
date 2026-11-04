-- Issue #55: single transaction for validating the expected position and persisting a move.
-- Deliberately SECURITY INVOKER: only the trusted Edge Function's service_role
-- may call this RPC. The Edge Function is responsible for chess.js move legality.
-- Do not deploy before the corresponding Edge Functions are deployed together.
-- Existing moves trigger remains in place: its update of games is in this transaction.

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE public.games ADD CONSTRAINT games_status_check
  CHECK (status IN ('waiting', 'active', 'checkmate', 'draw', 'resigned', 'aborted', 'timeout'));

CREATE OR REPLACE FUNCTION public.persist_validated_move(
  p_game_id uuid,
  p_actor_id uuid,
  p_expected_ply integer,
  p_expected_fen text,
  p_expected_updated_at timestamptz,
  p_uci text,
  p_san text,
  p_next_fen text,
  p_next_turn text,
  p_next_status text,
  p_winner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_game public.games%ROWTYPE;
  v_actor_color text;
  v_clock_color text;
  v_factor numeric;
  v_elapsed_ms numeric;
  v_remaining_ms numeric;
  v_increment_ms numeric;
  v_clocks jsonb;
BEGIN
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'game_not_found');
  END IF;

  v_actor_color := CASE
    WHEN p_actor_id = v_game.white_id THEN 'w'
    WHEN p_actor_id = v_game.black_id THEN 'b'
    ELSE NULL
  END;
  IF v_actor_color IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF v_game.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'game_over');
  END IF;
  IF v_game.turn <> v_actor_color THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_your_turn');
  END IF;

  -- A resignation or timeout can modify updated_at without advancing the ply.
  IF v_game.move_count IS DISTINCT FROM p_expected_ply
      OR v_game.fen IS DISTINCT FROM p_expected_fen
      OR v_game.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_update');
  END IF;

  -- Use database time and calculate the updated clock while holding the
  -- game row lock. Edge/user-supplied clock values are never persisted.
  IF v_game.clocks IS NOT NULL THEN
    v_clock_color := CASE WHEN v_game.turn = 'w' THEN 'white' ELSE 'black' END;
    v_factor := CASE
      WHEN v_game.clocks->>'unit' = 'ms' OR NOT (v_game.clocks ? 'initialSeconds') THEN 1
      ELSE 1000
    END;
    v_elapsed_ms := greatest(0, extract(epoch FROM (clock_timestamp() - v_game.updated_at)) * 1000);
    v_remaining_ms := (v_game.clocks->>v_clock_color)::numeric * v_factor - v_elapsed_ms;
    IF v_remaining_ms <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'clock_expired');
    END IF;
    v_increment_ms := greatest(0, coalesce((v_game.clocks->>'incrementSeconds')::numeric, 0) * 1000);
    v_clocks := v_game.clocks || jsonb_build_object(
      'unit', 'ms',
      'white', CASE WHEN v_clock_color = 'white'
        THEN round(v_remaining_ms + v_increment_ms)::bigint
        ELSE round((v_game.clocks->>'white')::numeric * v_factor)::bigint END,
      'black', CASE WHEN v_clock_color = 'black'
        THEN round(v_remaining_ms + v_increment_ms)::bigint
        ELSE round((v_game.clocks->>'black')::numeric * v_factor)::bigint END
    );
  ELSE
    v_clocks := NULL;
  END IF;

  IF p_uci !~ '^[a-h][1-8][a-h][1-8][qrbn]?$'
      OR p_next_fen IS NULL OR length(p_next_fen) = 0
      OR p_next_turn IS DISTINCT FROM CASE WHEN v_game.turn = 'w' THEN 'b' ELSE 'w' END
      OR p_next_status IS NULL OR p_next_status NOT IN ('active', 'checkmate', 'draw')
      OR (p_next_status = 'checkmate' AND p_winner_id IS DISTINCT FROM p_actor_id)
      OR (p_next_status <> 'checkmate' AND p_winner_id IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition');
  END IF;

  UPDATE public.games SET
    fen = p_next_fen,
    turn = p_next_turn,
    last_move_uci = p_uci,
    move_count = p_expected_ply + 1,
    clocks = v_clocks,
    status = p_next_status,
    winner_id = p_winner_id,
    updated_at = clock_timestamp()
  WHERE id = p_game_id;

  -- Existing AFTER INSERT trigger updates games again, within this same
  -- transaction. If this insert or the trigger fails, the UPDATE is rolled back.
  INSERT INTO public.moves (game_id, ply, uci, san, fen_after, played_by)
  VALUES (p_game_id, p_expected_ply + 1, p_uci, p_san, p_next_fen, p_actor_id);

  RETURN jsonb_build_object('ok', true, 'ply', p_expected_ply + 1);
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_validated_move(
  uuid, uuid, integer, text, timestamptz, text, text, text, text, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_validated_move(
  uuid, uuid, integer, text, timestamptz, text, text, text, text, jsonb, text, uuid
) TO service_role;

-- Server-side timeout arbitration uses a row lock and database time.
-- This prevents a stale timeout request from overwriting a newer move.
CREATE OR REPLACE FUNCTION public.finalize_game_timeout(
  p_game_id uuid,
  p_actor_id uuid,
  p_expected_ply integer,
  p_expected_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_game public.games%ROWTYPE;
  v_side text;
  v_factor numeric;
  v_elapsed_ms numeric;
  v_remaining_ms numeric;
  v_new_clocks jsonb;
  v_winner_id uuid;
BEGIN
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'game_not_found');
  END IF;
  IF p_actor_id NOT IN (v_game.white_id, v_game.black_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF v_game.status <> 'active'
      OR v_game.move_count IS DISTINCT FROM p_expected_ply
      OR v_game.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'state_changed');
  END IF;

  IF v_game.clocks IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'timeout', false);
  END IF;

  v_side := CASE WHEN v_game.turn = 'w' THEN 'white' ELSE 'black' END;
  IF v_game.clocks->>'white' IS NULL OR v_game.clocks->>'black' IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_clocks');
  END IF;

  -- Legacy online/Hydra games stored remaining time in seconds; legacy simuls
  -- without initialSeconds already stored milliseconds.
  v_factor := CASE
    WHEN v_game.clocks->>'unit' = 'ms' OR NOT (v_game.clocks ? 'initialSeconds') THEN 1
    ELSE 1000
  END;
  v_remaining_ms := (v_game.clocks->>v_side)::numeric * v_factor;
  v_elapsed_ms := greatest(0, extract(epoch FROM (clock_timestamp() - v_game.updated_at)) * 1000);
  IF v_remaining_ms > v_elapsed_ms THEN
    RETURN jsonb_build_object('ok', true, 'timeout', false);
  END IF;

  v_winner_id := CASE WHEN v_game.turn = 'w' THEN v_game.black_id ELSE v_game.white_id END;
  v_new_clocks := v_game.clocks || jsonb_build_object(
    'unit', 'ms',
    'white', CASE WHEN v_side = 'white' THEN 0 ELSE round((v_game.clocks->>'white')::numeric * v_factor)::bigint END,
    'black', CASE WHEN v_side = 'black' THEN 0 ELSE round((v_game.clocks->>'black')::numeric * v_factor)::bigint END
  );
  UPDATE public.games SET
    status = 'timeout',
    winner_id = v_winner_id,
    clocks = v_new_clocks,
    updated_at = clock_timestamp()
  WHERE id = p_game_id;

  RETURN jsonb_build_object('ok', true, 'timeout', true, 'winner_id', v_winner_id, 'status', 'timeout');
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_game_timeout(uuid, uuid, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_game_timeout(uuid, uuid, integer, timestamptz)
  TO service_role;
