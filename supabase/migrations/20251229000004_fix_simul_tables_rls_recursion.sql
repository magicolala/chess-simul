-- Fix RLS recursion for simul_tables SELECT policy

-- Drop the old policy to ensure clean recreation
drop policy if exists "Simul tables visible to host or open simuls" on public.simul_tables;

-- Create a SECURITY DEFINER function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_simul_visible(p_simul_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.simuls s
    WHERE s.id = p_simul_id
      AND (s.host_id = auth.uid() OR s.status IN ('open', 'running'))
  );
$$;

-- Recreate the SELECT policy for simul_tables using the new helper function
create policy "Simul tables visible to host or open simuls" on public.simul_tables
  for select
  using (
    public.is_simul_visible(simul_id)
  );
