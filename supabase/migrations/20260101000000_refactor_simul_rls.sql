-- Refactor simul policies to avoid recursive RLS checks

-- Helper functions to evaluate simul membership without triggering table RLS
create or replace function public.is_simul_host(p_simul_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.simuls s
    where s.id = p_simul_id
      and s.host_id = coalesce(p_user_id, auth.uid())
  );
$$;

create or replace function public.is_simul_challenger(p_simul_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.simul_tables st
    where st.simul_id = p_simul_id
      and st.challenger_id = coalesce(p_user_id, auth.uid())
  );
$$;

create or replace function public.can_view_simul(p_simul_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.simuls s
    where s.id = p_simul_id
      and (
        s.status in ('open', 'running')
        or public.is_simul_host(s.id, p_user_id)
        or public.is_simul_challenger(s.id, p_user_id)
      )
  );
$$;

-- Keep legacy callers aligned
create or replace function public.is_host(p_simul_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select public.is_simul_host(p_simul_id);
$$;

-- Recreate simul policies using helper functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'simuls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.simuls;
  END IF;
END $$;

drop policy if exists "Simuls selectable when visible or by host" on public.simuls;
drop policy if exists "Simuls insertable by host" on public.simuls;
drop policy if exists "Simuls updatable by host" on public.simuls;
drop policy if exists "Simuls deletable by host" on public.simuls;

drop policy if exists "Simuls selectable by host or guest" on public.simuls;
drop policy if exists "Simuls insert by host" on public.simuls;
drop policy if exists "Simuls update by host" on public.simuls;
drop policy if exists "Simuls delete by host" on public.simuls;

create policy "Simuls selectable when visible or by host" on public.simuls
  for select
  using (public.can_view_simul(id));

create policy "Simuls insertable by host" on public.simuls
  for insert
  with check (host_id = auth.uid());

create policy "Simuls updatable by host" on public.simuls
  for update
  using (public.is_simul_host(id))
  with check (public.is_simul_host(id));

create policy "Simuls deletable by host" on public.simuls
  for delete
  using (public.is_simul_host(id));

-- Recreate simul_tables policies without cross-table RLS queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'simul_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.simul_tables;
  END IF;
END $$;

drop policy if exists "Simul tables visible to host or open simuls" on public.simul_tables;
drop policy if exists "Simul tables insertable by host" on public.simul_tables;
drop policy if exists "Simul tables updatable by host" on public.simul_tables;
drop policy if exists "Simul tables deletable by host" on public.simul_tables;
drop policy if exists "Simul tables selectable for lobby" on public.simul_tables;
drop policy if exists "Simul tables selectable by host or guest" on public.simul_tables;
drop policy if exists "Simul tables insert by host" on public.simul_tables;
drop policy if exists "Simul tables update by host" on public.simul_tables;
drop policy if exists "Simul tables delete by host" on public.simul_tables;

drop policy if exists "Simul tables joinable by challenger" on public.simul_tables;
drop policy if exists "Simul tables join or leave by challenger" on public.simul_tables;

create policy "Simul tables visible to host or open simuls" on public.simul_tables
  for select
  using (public.can_view_simul(simul_tables.simul_id));

create policy "Simul tables insertable by host" on public.simul_tables
  for insert
  with check (public.is_simul_host(simul_tables.simul_id));

create policy "Simul tables updatable by host" on public.simul_tables
  for update
  using (public.is_simul_host(simul_tables.simul_id))
  with check (public.is_simul_host(simul_tables.simul_id));

create policy "Simul tables deletable by host" on public.simul_tables
  for delete
  using (public.is_simul_host(simul_tables.simul_id));
