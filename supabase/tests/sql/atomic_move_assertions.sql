-- SQL integration assertions for issue #55; run only in disposable PostgreSQL.
-- The migration must have been applied after atomic_move_fixture.sql.
DO $body$
BEGIN
  IF has_function_privilege('anon',
      'public.persist_validated_move(uuid,uuid,integer,text,timestamptz,text,text,text,text,text,uuid)',
      'EXECUTE')
      OR has_function_privilege('authenticated',
      'public.persist_validated_move(uuid,uuid,integer,text,timestamptz,text,text,text,text,text,uuid)',
      'EXECUTE')
      OR has_function_privilege('anon',
      'public.finalize_game_timeout(uuid,uuid,integer,timestamptz)',
      'EXECUTE')
      OR has_function_privilege('authenticated',
      'public.finalize_game_timeout(uuid,uuid,integer,timestamptz)',
      'EXECUTE') THEN
    RAISE EXCEPTION 'Unsafe RPC grants: anonymous roles must not execute game RPCs';
  END IF;

  IF NOT has_function_privilege('service_role',
      'public.persist_validated_move(uuid,uuid,integer,text,timestamptz,text,text,text,text,text,uuid)',
      'EXECUTE')
      OR NOT has_function_privilege('service_role',
      'public.finalize_game_timeout(uuid,uuid,integer,timestamptz)',
      'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must be able to execute both game RPCs';
  END IF;
END;
$body$;

-- Verify the invoker role can perform every step, not merely execute the RPC.
SET ROLE service_role;

DO $body$
DECLARE
  v_game uuid := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_white uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_black uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_start text := 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  v_next text := 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  v_updated_at timestamptz;
  v_result jsonb;
  v_stored public.games%ROWTYPE;
  v_count integer;
BEGIN
  INSERT INTO public.games (id, white_id, black_id, status, clocks)
  VALUES (
    v_game, v_white, v_black, 'active',
    '{"unit":"ms","initialSeconds":300,"incrementSeconds":2,"white":300000,"black":300000}'
  );
  SELECT updated_at INTO v_updated_at FROM public.games WHERE id = v_game;

  SELECT public.persist_validated_move(
    v_game,v_white,0,v_start,v_updated_at,'e2e4','e4',v_next,'b','active',NULL
  ) INTO v_result;
  IF v_result->>'ok' IS DISTINCT FROM 'true' OR (v_result->>'ply')::integer <> 1 THEN
    RAISE EXCEPTION 'Atomic move rejected: %',v_result;
  END IF;

  SELECT * INTO v_stored FROM public.games WHERE id = v_game;
  IF v_stored.fen <> v_next OR v_stored.move_count <> 1
      OR v_stored.turn <> 'b' OR v_stored.last_move_uci <> 'e2e4' THEN
    RAISE EXCEPTION 'Game row diverges from persisted move';
  END IF;
  IF (v_stored.clocks->>'white')::numeric NOT BETWEEN 300000 AND 302000
      OR (v_stored.clocks->>'black')::integer <> 300000
      OR v_stored.clocks->>'unit' <> 'ms' THEN
    RAISE EXCEPTION 'Clock unit/increment is incorrect: %',v_stored.clocks;
  END IF;

  SELECT count(*) INTO v_count FROM public.moves
  WHERE game_id = v_game AND ply=1 AND played_by=v_white AND uci='e2e4';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'No unique move event recorded';
  END IF;

  -- Stale requests must never append a second first move.
  SELECT public.persist_validated_move(
    v_game,v_white,0,v_start,v_updated_at,'d2d4','d4',v_next,'b','active',NULL
  ) INTO v_result;
  IF v_result->>'ok' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'Stale move was accepted: %',v_result;
  END IF;
  SELECT count(*) INTO v_count FROM public.moves WHERE game_id = v_game;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Stale move appended a second event';
  END IF;

  -- Nonparticipants cannot mutate the game through the privileged RPC.
  SELECT public.persist_validated_move(
    v_game,'33333333-3333-4333-8333-333333333333'::uuid,
    1,v_next,v_stored.updated_at,'e7e5','e5',v_next,'w','active',NULL
  ) INTO v_result;
  IF v_result->>'error' IS DISTINCT FROM 'forbidden' THEN
    RAISE EXCEPTION 'Unauthorized actor accepted: %',v_result;
  END IF;
END;
$body$;

DO $body$
DECLARE
  v_game uuid := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid;
  v_white uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_black uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_timestamp timestamptz;
  v_result jsonb;
  v_stored public.games%ROWTYPE;
BEGIN
  INSERT INTO public.games (id,white_id,black_id,status,clocks,updated_at)
  VALUES (
    v_game,v_white,v_black,'active',
    '{"unit":"ms","initialSeconds":300,"incrementSeconds":0,"white":0,"black":300000}',
    clock_timestamp()-interval '1 second'
  );
  SELECT updated_at INTO v_timestamp FROM public.games WHERE id=v_game;

  SELECT public.finalize_game_timeout(v_game,v_white,0,v_timestamp) INTO v_result;
  IF v_result->>'ok' <> 'true' OR v_result->>'timeout' <> 'true' THEN
    RAISE EXCEPTION 'Timeout was not finalized: %',v_result;
  END IF;
  SELECT * INTO v_stored FROM public.games WHERE id=v_game;
  IF v_stored.status <> 'timeout' OR v_stored.winner_id <> v_black
      OR v_stored.move_count <> 0 THEN
    RAISE EXCEPTION 'Timeout result/winner invalid';
  END IF;

  SELECT public.finalize_game_timeout(v_game,v_white,0,v_timestamp) INTO v_result;
  IF v_result->>'error' <> 'state_changed' THEN
    RAISE EXCEPTION 'Stale timeout was not rejected: %',v_result;
  END IF;
END;
$body$;

RESET ROLE;
SELECT 'Issue #55 PostgreSQL RPC integration tests PASSED' AS result;
