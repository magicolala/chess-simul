-- Align simul status enums
-- Normalize legacy values
update public.simuls set status = 'open' where status in ('pending');
update public.simuls set status = 'running' where status in ('active');
update public.simuls set status = 'closed' where status in ('completed','cancelled');

update public.simul_tables set status = 'free' where status in ('open');
update public.simul_tables set status = 'reserved' where status in ('seated');
update public.simul_tables set status = 'playing' where status in ('active');
update public.simul_tables set status = 'done' where status in ('completed','cancelled');

update public.games set status = 'waiting' where status in ('pending');
update public.games set status = 'playing' where status in ('active');
update public.games set status = 'finished' where status in ('draw','white_won','black_won','cancelled');

-- Refresh constraints for new state machines
alter table public.simuls drop constraint if exists simuls_status_check;
alter table public.simuls add constraint simuls_status_check check (status in ('open','running','closed'));
alter table public.simuls alter column status set default 'open';

alter table public.simul_tables drop constraint if exists simul_tables_status_check;
alter table public.simul_tables add constraint simul_tables_status_check check (status in ('free','reserved','playing','done'));
alter table public.simul_tables alter column status set default 'free';

alter table public.games drop constraint if exists games_status_check;
alter table public.games add constraint games_status_check check (status in ('waiting','playing','finished'));
alter table public.games alter column status set default 'waiting';

-- Function: create_simul
create or replace function public.create_simul(p_host_id uuid, p_name text, p_tables_count integer)
returns public.simuls
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_simul public.simuls;
begin
  if auth.uid() is null or auth.uid() <> p_host_id then
    raise exception 'only host can create simul';
  end if;

  if coalesce(p_tables_count, 0) <= 0 then
    raise exception 'tables_count must be positive';
  end if;

  insert into public.simuls (host_id, name, status)
  values (p_host_id, p_name, 'open')
  returning * into new_simul;

  insert into public.simul_tables (simul_id, seat_no, status)
  select new_simul.id, gs, 'free'
  from generate_series(1, p_tables_count) as gs;

  return new_simul;
end;
$$;

-- Function: join_simul
create or replace function public.join_simul(p_simul_id uuid)
returns public.simul_tables
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  chosen_table public.simul_tables;
  simul_record public.simuls;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into simul_record from public.simuls where id = p_simul_id for update;
  if not found then
    raise exception 'simul not found';
  end if;
  if simul_record.status <> 'open' then
    raise exception 'simul is not open for joining';
  end if;

  -- prevent double seating
  if exists (select 1 from public.simul_tables where simul_id = p_simul_id and guest_id = auth.uid()) then
    select * into chosen_table from public.simul_tables where simul_id = p_simul_id and guest_id = auth.uid();
    return chosen_table;
  end if;

  select *
  into chosen_table
  from public.simul_tables st
  where st.simul_id = p_simul_id
    and st.status = 'free'
  order by st.seat_no
  for update skip locked
  limit 1;

  if not found then
    raise exception 'no seat available';
  end if;

  update public.simul_tables
  set guest_id = auth.uid(),
      status = 'reserved',
      updated_at = now()
  where id = chosen_table.id
  returning * into chosen_table;

  return chosen_table;
end;
$$;

-- Function: start_simul_game
create or replace function public.start_simul_game(p_simul_table_id uuid)
returns public.games
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  st record;
  new_game public.games;
begin
  select st.*, s.host_id, s.status as simul_status
  into st
  from public.simul_tables st
  join public.simuls s on s.id = st.simul_id
  where st.id = p_simul_table_id
  for update;

  if not found then
    raise exception 'table not found';
  end if;

  if st.host_id <> auth.uid() then
    raise exception 'only host can start games';
  end if;

  if st.simul_status = 'closed' then
    raise exception 'simul already closed';
  end if;

  if st.guest_id is null then
    raise exception 'cannot start table without guest';
  end if;

  if st.game_id is not null then
    select * into new_game from public.games where id = st.game_id;
    return new_game;
  end if;

  insert into public.games (mode, simul_id, host_id, white_id, black_id, status)
  values ('simul', st.simul_id, st.host_id, st.host_id, st.guest_id, 'waiting')
  returning * into new_game;

  update public.simul_tables
  set game_id = new_game.id,
      status = 'playing',
      updated_at = now()
  where id = p_simul_table_id;

  update public.simuls
  set status = 'running',
      updated_at = now()
  where id = st.simul_id and status = 'open';

  return new_game;
end;
$$;

-- RLS adjustments: reinforce host-only updates and keep guests read access
drop policy if exists "Simuls selectable by host or guest" on public.simuls;
create policy "Simuls selectable by host or guest" on public.simuls
  for select using (
    host_id = auth.uid()
    or exists (
      select 1 from public.simul_tables st
      where st.simul_id = simuls.id and st.guest_id = auth.uid()
    )
  );

drop policy if exists "Simuls insert by host" on public.simuls;
create policy "Simuls insert by host" on public.simuls
  for insert with check (host_id = auth.uid());

drop policy if exists "Simuls update by host" on public.simuls;
create policy "Simuls update by host" on public.simuls
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists "Simuls delete by host" on public.simuls;
create policy "Simuls delete by host" on public.simuls
  for delete using (host_id = auth.uid());

drop policy if exists "Simul tables selectable by host or guest" on public.simul_tables;
create policy "Simul tables selectable by host or guest" on public.simul_tables
  for select using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
    or guest_id = auth.uid()
  );

drop policy if exists "Simul tables insert by host" on public.simul_tables;
create policy "Simul tables insert by host" on public.simul_tables
  for insert with check (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );

drop policy if exists "Simul tables update by host" on public.simul_tables;
create policy "Simul tables update by host" on public.simul_tables
  for update using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );

drop policy if exists "Simul tables delete by host" on public.simul_tables;
create policy "Simul tables delete by host" on public.simul_tables
  for delete using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );
