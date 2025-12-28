-- Tighten RLS and policies for chess simul tables

-- Helper functions
create or replace function public.is_host(p_simul_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.simuls s
    where s.id = p_simul_id
      and s.host_id = auth.uid()
  );
$$;

create or replace function public.is_participant(p_game_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.games g
    left join public.simul_tables st on st.game_id = g.id
    left join public.simuls s on s.id = coalesce(g.simul_id, st.simul_id)
    where g.id = p_game_id
      and (
        g.white_id = auth.uid()
        or g.black_id = auth.uid()
        or g.host_id = auth.uid()
        or (s.id is not null and s.host_id = auth.uid())
      )
  );
$$;

drop function if exists public.is_game_participant(uuid);

-- Ensure RLS is enabled
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.simuls enable row level security;
alter table public.simul_tables enable row level security;
alter table public.games enable row level security;
alter table public.moves enable row level security;

-- Profiles policies
alter publication supabase_realtime add table public.profiles;
drop policy if exists "Profiles are selectable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;

create policy "Profiles are publicly selectable" on public.profiles
  for select
  using (true);

create policy "Profiles are updatable by owner" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- User settings policies
alter publication supabase_realtime add table public.user_settings;
drop policy if exists "User settings CRUD by owner" on public.user_settings;

create policy "User settings CRUD by owner" on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Simuls policies
alter publication supabase_realtime add table public.simuls;
drop policy if exists "Simuls selectable by host or guest" on public.simuls;
drop policy if exists "Simuls insert by host" on public.simuls;
drop policy if exists "Simuls update by host" on public.simuls;
drop policy if exists "Simuls delete by host" on public.simuls;

create policy "Simuls selectable when visible or by host" on public.simuls
  for select
  using (
    host_id = auth.uid()
    or status in ('open', 'running')
  );

create policy "Simuls insertable by host" on public.simuls
  for insert
  with check (host_id = auth.uid());

create policy "Simuls updatable by host" on public.simuls
  for update
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "Simuls deletable by host" on public.simuls
  for delete
  using (host_id = auth.uid());

-- Simul tables policies
alter publication supabase_realtime add table public.simul_tables;
drop policy if exists "Simul tables selectable by host or guest" on public.simul_tables;
drop policy if exists "Simul tables insert by host" on public.simul_tables;
drop policy if exists "Simul tables update by host" on public.simul_tables;
drop policy if exists "Simul tables delete by host" on public.simul_tables;
drop policy if exists "Simul tables joinable by challenger" on public.simul_tables;

create policy "Simul tables visible to host or open simuls" on public.simul_tables
  for select
  using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id
        and (s.host_id = auth.uid() or s.status in ('open', 'running'))
    )
  );

create policy "Simul tables insertable by host" on public.simul_tables
  for insert
  with check (public.is_host(simul_tables.simul_id));

create policy "Simul tables updatable by host" on public.simul_tables
  for update
  using (public.is_host(simul_tables.simul_id))
  with check (public.is_host(simul_tables.simul_id));

create policy "Simul tables deletable by host" on public.simul_tables
  for delete
  using (public.is_host(simul_tables.simul_id));

create policy "Simul tables join or leave by challenger" on public.simul_tables
  for update
  using (
    simul_tables.status = 'open' and simul_tables.challenger_id is null
  )
  with check (
    simul_tables.challenger_id = auth.uid() and simul_tables.status = 'playing'
  );

-- Games policies
alter publication supabase_realtime add table public.games;
drop policy if exists "Games selectable by participants" on public.games;
drop policy if exists "Games insert by participants" on public.games;
drop policy if exists "Games update by host or current player" on public.games;

create policy "Games visible to participants or simul host" on public.games
  for select
  using (
    public.is_participant(id) or public.is_host(simul_id)
  );

create policy "Games insertable by host" on public.games
  for insert
  with check (host_id = auth.uid());

create policy "Games updatable by participants" on public.games
  for update
  using (public.is_participant(id) or public.is_host(simul_id))
  with check (public.is_participant(id) or public.is_host(simul_id));

create policy "Games deletable by host" on public.games
  for delete
  using (host_id = auth.uid());

-- Moves policies
alter publication supabase_realtime add table public.moves;
drop policy if exists "Moves selectable by participants" on public.moves;
drop policy if exists "Moves insertable by participants" on public.moves;
drop policy if exists "Moves updatable by participants" on public.moves;
drop policy if exists "Moves deletable by participants" on public.moves;

create policy "Moves visible to participants or simul host" on public.moves
  for select
  using (
    public.is_participant(game_id)
    or public.is_host((select g.simul_id from public.games g where g.id = moves.game_id))
  );

create policy "Moves insertable by participants" on public.moves
  for insert
  with check (public.is_participant(game_id));

create policy "Moves updatable by participants" on public.moves
  for update
  using (public.is_participant(game_id))
  with check (public.is_participant(game_id));

create policy "Moves deletable by participants" on public.moves
  for delete
  using (public.is_participant(game_id));
