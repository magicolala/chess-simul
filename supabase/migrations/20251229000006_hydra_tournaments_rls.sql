-- 20251229_hydra_tournaments_rls.sql

ALTER TABLE public.hydra_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydra_game_pgn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydra_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydra_matchmaking_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view games and scores for tournaments
CREATE POLICY "Authenticated can view hydra games"
ON public.hydra_games FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated can view hydra score events"
ON public.hydra_score_events FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated can view hydra matchmaking events"
ON public.hydra_matchmaking_events FOR SELECT
TO authenticated
USING (TRUE);

-- Restrict writes to service_role or Edge Functions
CREATE POLICY "Service role can write hydra games"
ON public.hydra_games FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "Service role can write hydra game pgn"
ON public.hydra_game_pgn FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "Service role can write hydra score events"
ON public.hydra_score_events FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

CREATE POLICY "Service role can write hydra matchmaking events"
ON public.hydra_matchmaking_events FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

GRANT ALL ON public.hydra_games TO authenticated;
GRANT ALL ON public.hydra_games TO service_role;
GRANT ALL ON public.hydra_game_pgn TO service_role;
GRANT ALL ON public.hydra_score_events TO authenticated;
GRANT ALL ON public.hydra_score_events TO service_role;
GRANT ALL ON public.hydra_matchmaking_events TO authenticated;
GRANT ALL ON public.hydra_matchmaking_events TO service_role;
