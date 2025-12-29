
-- 20251229000000_create_hydra_match_queue_table.sql

-- Create the hydra_match_queue table
CREATE TABLE public.hydra_match_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    elo INT,
    max_games INT DEFAULT 1 NOT NULL,
    time_control_initial INT NOT NULL, -- Initial time in minutes
    time_control_increment INT NOT NULL, -- Increment in seconds
    status TEXT DEFAULT 'waiting' NOT NULL
);

-- Add an index for faster lookups
CREATE INDEX hydra_match_queue_user_id_idx ON public.hydra_match_queue (user_id);
CREATE INDEX hydra_match_queue_time_control_idx ON public.hydra_match_queue (time_control_initial, time_control_increment);
CREATE INDEX hydra_match_queue_elo_idx ON public.hydra_match_queue (elo);
CREATE INDEX hydra_match_queue_status_idx ON public.hydra_match_queue (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.hydra_match_queue ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view their own queue entries and other 'waiting' entries
CREATE POLICY "Users can view all waiting hydra queue entries"
ON public.hydra_match_queue FOR SELECT
TO authenticated
USING (status = 'waiting' OR user_id = auth.uid());

-- Policy to allow authenticated users to insert their own queue entries
CREATE POLICY "Users can insert their own hydra queue entries"
ON public.hydra_match_queue FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy to allow authenticated users to update their own queue entries (e.g., status, max_games)
CREATE POLICY "Users can update their own hydra queue entries"
ON public.hydra_match_queue FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Policy to allow authenticated users to delete their own queue entries
CREATE POLICY "Users can delete their own hydra queue entries"
ON public.hydra_match_queue FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Grant access to the table for authenticated users
GRANT ALL ON public.hydra_match_queue TO authenticated;
GRANT ALL ON public.hydra_match_queue TO service_role;

-- Make sure the table is exposed to Supabase Realtime for broadcasting changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.hydra_match_queue;

-- Down migration (for rollback)
-- DROP PUBLICATION IF EXISTS supabase_realtime DROP TABLE public.hydra_match_queue;
-- DROP TABLE IF EXISTS public.hydra_match_queue;
