-- Add missing RLS policy to allow challengers to join open simul tables
-- The previous policy "Simul tables joinable by challenger" was dropped but never recreated

-- Allow authenticated users to update a simul_table row when:
-- 1. The table status is 'open'
-- 2. The challenger_id is NULL (unclaimed seat)
-- 3. The user is setting themselves as the challenger

drop policy if exists "Simul tables joinable by challenger" on public.simul_tables;

create policy "Simul tables joinable by challenger" on public.simul_tables
  for update
  using (
    -- Can only update open tables with no challenger
    status = 'open' 
    and challenger_id is null
  )
  with check (
    -- User must be setting themselves as the challenger
    challenger_id = auth.uid()
  );
