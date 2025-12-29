
-- 20251229000002_create_hydra_tournaments_table.sql

-- Create the hydra_tournaments table
CREATE TABLE public.hydra_tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('arena', 'survival')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    duration_minutes INT, -- For 'arena' type
    capital_lives INT, -- For 'survival' type
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX hydra_tournaments_status_idx ON public.hydra_tournaments (status);
CREATE INDEX hydra_tournaments_type_idx ON public.hydra_tournaments (type);
CREATE INDEX hydra_tournaments_start_time_idx ON public.hydra_tournaments (start_time);

-- Enable Row Level Security (RLS)
ALTER TABLE public.hydra_tournaments ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to view tournaments
CREATE POLICY "Authenticated users can view all hydra tournaments"
ON public.hydra_tournaments FOR SELECT
TO authenticated
USING (TRUE);

-- Policy to allow creators to insert tournaments (requires a host_id, will add later if needed)
-- For now, no specific RLS for insert as a dedicated admin function might create them.
-- If users can create tournaments, need to add `host_id` and corresponding policy.

-- Policy to allow updates only by privileged users (e.g., admin) or the host
-- For simplicity, initially allow service_role to update
CREATE POLICY "Service role can update hydra tournaments"
ON public.hydra_tournaments FOR UPDATE
TO service_role
USING (TRUE); -- More restrictive policies can be added later

-- Grant access to the table
GRANT ALL ON public.hydra_tournaments TO authenticated;
GRANT ALL ON public.hydra_tournaments TO service_role;

-- Down migration (for rollback)
-- DROP TABLE IF EXISTS public.hydra_tournaments;
