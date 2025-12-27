-- Replace the UUID placeholders with real user IDs before running.
-- Run via `supabase db connect` and paste this file, or `psql -f supabase/tests/security_checks.sql` against the local instance.

-- Host session
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<HOST_USER_ID>', true);

-- Host should see their own simul and all attached rows
select 'host_simuls' as label, count(*) as visible from public.simuls where host_id = auth.uid();
select 'host_games' as label, count(*) as visible from public.games where public.is_participant(id) or public.is_host(simul_id);

-- Guest session
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<GUEST_USER_ID>', true);

-- Guest should only see open/running simuls and their own games/moves
select 'guest_simuls' as label, count(*) as visible from public.simuls where status in ('open','running');
select 'guest_games' as label, count(*) as visible from public.games where public.is_participant(id);
select 'guest_moves' as label, count(*) as visible from public.moves where public.is_participant(game_id);

-- Random authenticated user
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<STRANGER_USER_ID>', true);

-- Stranger should not see other peoples' games or moves
select 'stranger_games' as label, count(*) as visible from public.games;
select 'stranger_moves' as label, count(*) as visible from public.moves;
