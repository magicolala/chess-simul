-- Chess Simul #55 — Supabase staging integration smoke test.
-- Runs against the approved staging database only, not a production instance.
-- Reads two existing profiles; creates synthetic game rows in a nested
-- PostgreSQL subtransaction, asserts behaviour and ALWAYS rolls the rows back.
-- Usage: run this file through the Supabase SQL editor on staging.
-- It is intentionally not part of the disposable PostgreSQL CI fixture
-- because that fixture has no existing public.profiles table.

DO $staging_rpc_smoke$
DECLARE
  v_white uuid;
  v_black uuid;
  v_game uuid := gen_random_uuid();
  v_timeout_game uuid := gen_random_uuid();
  v_previous_updated timestamptz;
  v_result jsonb;
  v_moves integer;
  v_status text;
  v_winner uuid;
  v_start text := 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  v_after text := 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
BEGIN
  BEGIN
    SELECT id INTO v_white FROM public.profiles ORDER BY id LIMIT 1;
    SELECT id INTO v_black FROM public.profiles
      WHERE id <> v_white ORDER BY id LIMIT 1;
    IF v_white IS NULL OR v_black IS NULL THEN
      RAISE EXCEPTION 'At least two staging profiles are required';
    END IF;

    INSERT INTO public.games(id,white_id,black_id,status,clocks)
    VALUES (
      v_game,v_white,v_black,'active',
      '{"unit":"ms","initialSeconds":300,"incrementSeconds":2,"white":300000,"black":300000}'::jsonb
    );
    SELECT updated_at INTO v_previous_updated FROM public.games WHERE id=v_game;

    SELECT public.persist_validated_move(
      v_game,v_white,0,v_start,v_previous_updated,
      'e2e4','e4',v_after,'b','active',NULL
    ) INTO v_result;
    IF v_result->>'ok' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Atomic move failed: %',v_result;
    END IF;
    SELECT count(*) INTO v_moves FROM public.moves WHERE game_id=v_game AND ply=1;
    IF v_moves <> 1 THEN
      RAISE EXCEPTION 'Atomic move did not persist a move row';
    END IF;

    SELECT public.persist_validated_move(
      v_game,v_white,0,v_start,v_previous_updated,
      'd2d4','d4',v_after,'b','active',NULL
    ) INTO v_result;
    IF v_result->>'ok' IS DISTINCT FROM 'false' THEN
      RAISE EXCEPTION 'Stale first move was accepted: %',v_result;
    END IF;

    INSERT INTO public.games(id,white_id,black_id,status,clocks,updated_at)
    VALUES (
      v_timeout_game,v_white,v_black,'active',
      '{"unit":"ms","white":0,"black":300000,"initialSeconds":300,"incrementSeconds":0}'::jsonb,
      clock_timestamp()-interval '1 second'
    );
    SELECT updated_at INTO v_previous_updated FROM public.games WHERE id=v_timeout_game;

    SELECT public.finalize_game_timeout(
      v_timeout_game,v_white,0,v_previous_updated
    ) INTO v_result;
    IF v_result->>'ok' IS DISTINCT FROM 'true'
        OR v_result->>'timeout' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Timeout arbitration failed: %',v_result;
    END IF;
    SELECT status,winner_id INTO v_status,v_winner
      FROM public.games WHERE id=v_timeout_game;
    IF v_status IS DISTINCT FROM 'timeout' OR v_winner IS DISTINCT FROM v_black THEN
      RAISE EXCEPTION 'Timeout result/winner incorrect';
    END IF;

    -- Force rollback of BOTH test games and their moves. The outer block
    -- succeeds only when every assertion above was true.
    RAISE EXCEPTION 'CHESS_SIMUL_ROLLBACK_VERIFIED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'CHESS_SIMUL_ROLLBACK_VERIFIED' THEN RAISE; END IF;
  END;
END;
$staging_rpc_smoke$;

SELECT 'PASS — atomic move, stale replay and timeout; synthetic rows rolled back' AS result;
