
-- 20251229000003_create_hydra_tournament_participants_table.sql

-- Create the hydra_tournament_participants table
CREATE TABLE public.hydra_tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.hydra_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT DEFAULT 0 NOT NULL,
    lives_remaining INT, -- Nullable, specifically for 'survival' type tournaments
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (tournament_id, user_id) -- A user can only participate once per tournament
);

-- Add indexes for better performance
CREATE INDEX hydra_tournament_participants_tournament_id_idx ON public.hydra_tournament_participants (tournament_id);
CREATE INDEX hydra_tournament_participants_user_id_idx ON public.hydra_tournament_participants (user_id);
CREATE INDEX hydra_tournament_participants_score_idx ON public.hydra_tournament_participants (score);

-- Enable Row Level Security (RLS)
ALTER TABLE public.hydra_tournament_participants ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view participants of any tournament
CREATE POLICY "Authenticated users can view all hydra tournament participants"
ON public.hydra_tournament_participants FOR SELECT
TO authenticated
USING (TRUE);

-- Policy to allow authenticated users to insert their own participation
CREATE POLICY "Users can insert their own hydra tournament participation"
ON public.hydra_tournament_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy to allow authenticated users to update their own score/lives in a tournament (e.g. via a Supabase function)
CREATE POLICY "Users can update their own hydra tournament participation"
ON public.hydra_tournament_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Policy to allow authenticated users to delete their own participation
CREATE POLICY "Users can delete their own hydra tournament participation"
ON public.hydra_tournament_participants FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Grant access to the table
GRANT ALL ON public.hydra_tournament_participants TO authenticated;
GRANT ALL ON public.hydra_tournament_participants TO service_role;

-- Make sure the table is exposed to Supabase Realtime for broadcasting changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.hydra_tournament_participants;

-- Down migration (for rollback)
-- DROP TABLE IF EXISTS public.hydra_tournament_participants;
