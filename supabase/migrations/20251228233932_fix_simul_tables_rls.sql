-- Drop policies to ensure clean recreation
drop policy if exists "Simul tables join or leave by challenger" on public.simul_tables;
drop policy if exists "Simul tables insertable by host" on public.simul_tables;
drop policy if exists "Simul tables updatable by host" on public.simul_tables;
drop policy if exists "Simul tables deletable by host" on public.simul_tables;

-- Recreate "Simul tables insertable by host" with inlined logic
create policy "Simul tables insertable by host" on public.simul_tables
  for insert
  with check (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id
        and s.host_id = auth.uid()
    )
  );

-- Recreate "Simul tables updatable by host" with inlined logic
create policy "Simul tables updatable by host" on public.simul_tables
  for update
  using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id
        and s.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id
        and s.host_id = auth.uid()
    )
  );

-- Recreate "Simul tables deletable by host" with inlined logic
create policy "Simul tables deletable by host" on public.simul_tables
  for delete
  using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id
        and s.host_id = auth.uid()
    )
  );

-- The "Simul tables join or leave by challenger" policy remains disabled for now.