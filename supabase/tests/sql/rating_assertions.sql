-- Runs after rating_fixture.sql and the migration under PostgreSQL 17.
-- No production data is ever used.
DO $verify_privileges$
BEGIN
  IF has_column_privilege('authenticated', 'public.profiles', 'elo', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'elo', 'INSERT')
     OR has_column_privilege('anon', 'public.profiles', 'elo', 'UPDATE')
     OR has_column_privilege('anon', 'public.profiles', 'elo', 'INSERT') THEN
    RAISE EXCEPTION 'Users can still forge Elo by updating or inserting profiles';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.profiles', 'username', 'INSERT') THEN
    RAISE EXCEPTION 'Legitimate profile onboarding/editing was accidentally blocked';
  END IF;
  IF has_table_privilege('authenticated','public.rated_game_authorizations','INSERT')
     OR has_table_privilege('authenticated','public.game_rating_events','INSERT')
     OR has_table_privilege('authenticated','public.game_rating_events','SELECT')
     OR has_function_privilege('authenticated',
       'public.apply_completed_game_rating(uuid)','EXECUTE')
     OR has_function_privilege('anon',
       'public.apply_completed_game_rating(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Players can authorize or settle ratings without service_role';
  END IF;
  IF NOT has_function_privilege('service_role',
       'public.apply_completed_game_rating(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Service role cannot call settlement RPC';
  END IF;
END;
$verify_privileges$;

SET ROLE service_role;

DO $rating_smoke$
DECLARE
  white_id uuid := '11111111-1111-4111-8111-111111111111';
  black_id uuid := '22222222-2222-4222-8222-222222222222';
  old_game uuid := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  rated_win uuid := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  rated_draw uuid := 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  invalid_game uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  hydra_game uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  duplicate_game uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  invite_win uuid := 'abababab-abab-4aba-8aba-abababababab';
  invite_draw uuid := 'bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc';
  invite_invalid uuid := 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd';
  result jsonb;
  w_elo integer;
  b_elo integer;
  count_events integer;
  delta_sum integer;
  actual_status text;
BEGIN
  INSERT INTO public.profiles(id,username,elo) VALUES
    (white_id,'WhiteQA',1200), (black_id,'BlackQA',1200);
  INSERT INTO public.invites(id,from_user,to_user,status) VALUES
    (invite_win,white_id,black_id,'accepted'),
    (invite_draw,white_id,black_id,'accepted'),
    (invite_invalid,white_id,black_id,'accepted');

  -- The database contains historical completed games: never re-rate them.
  INSERT INTO public.games(id,white_id,black_id,status,winner_id)
  VALUES(old_game,white_id,black_id,'resigned',white_id);
  SELECT public.apply_completed_game_rating(old_game) INTO result;
  IF result->>'error' IS DISTINCT FROM 'not_rated' THEN
    RAISE EXCEPTION 'Old unapproved games must remain unrated: %',result;
  END IF;

  INSERT INTO public.games(id,white_id,black_id,status,winner_id)
  VALUES(rated_win,white_id,black_id,'checkmate',white_id);
  INSERT INTO public.rated_game_authorizations(game_id,source,source_invite_id)
  VALUES(rated_win,'accepted_invite',invite_win);

  -- Even if a buggy handler creates two games for the same invite, only
  -- the first can ever be authorized to award Elo.
  INSERT INTO public.games(id,white_id,black_id,status,winner_id)
  VALUES(duplicate_game,white_id,black_id,'checkmate',white_id);
  BEGIN
    INSERT INTO public.rated_game_authorizations(game_id,source,source_invite_id)
    VALUES(duplicate_game,'accepted_invite',invite_win);
    RAISE EXCEPTION 'Duplicate invite created a second rated game';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  SELECT public.apply_completed_game_rating(rated_win) INTO result;
  IF result->>'ok' IS DISTINCT FROM 'true'
      OR result->>'already_processed' IS DISTINCT FROM 'false'
      OR (result->>'white_delta')::integer <> 20
      OR (result->>'black_delta')::integer <> -20 THEN
    RAISE EXCEPTION 'Incorrect first rated white win: %',result;
  END IF;

  SELECT elo INTO w_elo FROM public.profiles WHERE id=white_id;
  SELECT elo INTO b_elo FROM public.profiles WHERE id=black_id;
  IF w_elo <> 1220 OR b_elo <> 1180 THEN
    RAISE EXCEPTION 'Rating did not update correctly (% vs %)',w_elo,b_elo;
  END IF;
  SELECT status INTO actual_status FROM public.games WHERE id=rated_win;
  IF actual_status <> 'checkmate' THEN
    RAISE EXCEPTION 'Rating processing overwrote a terminal game status';
  END IF;

  -- Duplicate/replayed requests must return a non-mutating success.
  SELECT public.apply_completed_game_rating(rated_win) INTO result;
  SELECT count(*) INTO count_events FROM public.game_rating_events;
  IF result->>'already_processed' IS DISTINCT FROM 'true' OR count_events <> 1 THEN
    RAISE EXCEPTION 'Duplicate rating event inserted: %',result;
  END IF;
  SELECT elo INTO w_elo FROM public.profiles WHERE id=white_id;
  SELECT elo INTO b_elo FROM public.profiles WHERE id=black_id;
  IF w_elo <> 1220 OR b_elo <> 1180 THEN
    RAISE EXCEPTION 'A replay modified Elo again';
  END IF;

  INSERT INTO public.games(id,white_id,black_id,status,winner_id)
  VALUES(rated_draw,white_id,black_id,'draw',NULL);
  INSERT INTO public.rated_game_authorizations(game_id,source,source_invite_id)
  VALUES(rated_draw,'accepted_invite',invite_draw);
  SELECT public.apply_completed_game_rating(rated_draw) INTO result;
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Draw rating failed: %',result;
  END IF;
  SELECT white_delta + black_delta INTO delta_sum
    FROM public.game_rating_events WHERE game_id=rated_draw;
  IF delta_sum <> 0 THEN
    RAISE EXCEPTION 'Equal-K draw should have net zero Elo delta';
  END IF;

  -- Missing winner is never treated as a draw, even if a caller asks for it.
  INSERT INTO public.games(id,white_id,black_id,status,winner_id)
  VALUES(invalid_game,white_id,black_id,'resigned',NULL);
  INSERT INTO public.rated_game_authorizations(game_id,source,source_invite_id)
  VALUES(invalid_game,'accepted_invite',invite_invalid);
  SELECT public.apply_completed_game_rating(invalid_game) INTO result;
  IF result->>'error' IS DISTINCT FROM 'invalid_outcome' THEN
    RAISE EXCEPTION 'An incomplete/forged outcome was accepted: %',result;
  END IF;

  -- Hydra tournament has separate hydra_games scoring and is not Elo.
  INSERT INTO public.games(id,white_id,black_id,status,winner_id,game_mode)
  VALUES(hydra_game,white_id,black_id,'draw',NULL,'hydra');
  INSERT INTO public.rated_game_authorizations(game_id,source)
  VALUES(hydra_game,'trusted_matchmaking');
  SELECT public.apply_completed_game_rating(hydra_game) INTO result;
  IF result->>'error' IS DISTINCT FROM 'not_rated' THEN
    RAISE EXCEPTION 'Hydra was incorrectly treated as a standard Elo game: %',result;
  END IF;

  SELECT count(*) INTO count_events FROM public.game_rating_events;
  IF count_events <> 2 THEN
    RAISE EXCEPTION 'Unexpected rating ledger size: %',count_events;
  END IF;
END;
$rating_smoke$;

RESET ROLE;

SELECT 'PASS: column privileges, server-only eligibility, first win, draw, idempotency, invalid result, Hydra isolation' AS result;
