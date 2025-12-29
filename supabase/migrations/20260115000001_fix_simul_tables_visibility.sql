-- Harden simul visibility checks to avoid recursive RLS evaluation on simul_tables

-- Challenger lookup that bypasses simul_tables row-level security to prevent recursion
create or replace function public.is_simul_challenger(p_simul_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, auth
set row_security = off
as $$
  select exists (
    select 1
    from public.simul_tables st
    where st.simul_id = p_simul_id
      and st.challenger_id = coalesce(p_user_id, auth.uid())
  );
$$;

-- Visibility helper that leverages the RLS-safe challenger check
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

-- Recreate the simul_tables select policy to ensure it uses the updated helper
drop policy if exists "Simul tables visible to host or open simuls" on public.simul_tables;

create policy "Simul tables visible to host or open simuls" on public.simul_tables
  for select
  using (public.can_view_simul(simul_tables.simul_id));
