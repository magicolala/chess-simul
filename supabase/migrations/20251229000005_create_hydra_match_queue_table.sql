-- 20251229000005_create_hydra_match_queue_table.sql

-- Create the hydra_match_queue table if missing (cloud history already contains 20251229000000).
CREATE TABLE IF NOT EXISTS public.hydra_match_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    elo INT,
    max_games INT DEFAULT 1 NOT NULL,
    time_control_initial INT NOT NULL, -- Initial time in minutes
    time_control_increment INT NOT NULL, -- Increment in seconds
    status TEXT DEFAULT 'waiting' NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS hydra_match_queue_user_id_idx ON public.hydra_match_queue (user_id);
CREATE INDEX IF NOT EXISTS hydra_match_queue_time_control_idx ON public.hydra_match_queue (time_control_initial, time_control_increment);
CREATE INDEX IF NOT EXISTS hydra_match_queue_elo_idx ON public.hydra_match_queue (elo);
CREATE INDEX IF NOT EXISTS hydra_match_queue_status_idx ON public.hydra_match_queue (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.hydra_match_queue ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent on cloud)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hydra_match_queue'
      AND policyname = 'Users can view all waiting hydra queue entries'
  ) THEN
    CREATE POLICY "Users can view all waiting hydra queue entries"
    ON public.hydra_match_queue FOR SELECT
    TO authenticated
    USING (status = 'waiting' OR user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hydra_match_queue'
      AND policyname = 'Users can insert their own hydra queue entries'
  ) THEN
    CREATE POLICY "Users can insert their own hydra queue entries"
    ON public.hydra_match_queue FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hydra_match_queue'
      AND policyname = 'Users can update their own hydra queue entries'
  ) THEN
    CREATE POLICY "Users can update their own hydra queue entries"
    ON public.hydra_match_queue FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hydra_match_queue'
      AND policyname = 'Users can delete their own hydra queue entries'
  ) THEN
    CREATE POLICY "Users can delete their own hydra queue entries"
    ON public.hydra_match_queue FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Grant access to the table for authenticated users
GRANT ALL ON public.hydra_match_queue TO authenticated;
GRANT ALL ON public.hydra_match_queue TO service_role;

-- Make sure the table is exposed to Supabase Realtime for broadcasting changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hydra_match_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hydra_match_queue;
  END IF;
END $$;
