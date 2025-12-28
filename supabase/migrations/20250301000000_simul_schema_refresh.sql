-- Simul schema refresh to align with simplified state machine

-- Drop legacy RPC helpers (frontend now uses direct queries)
drop function if exists public.create_simul(uuid, text, integer);
drop function if exists public.join_simul(uuid);
drop function if exists public.start_simul_game(uuid);

-- Ensure time control metadata exists
alter table public.simuls
  add column if not exists time_control jsonb not null default jsonb_build_object('initial', 600, 'increment', 5);

update public.simuls
set time_control = coalesce(time_control, jsonb_build_object('initial', 600, 'increment', 5));

-- Normalize simul statuses to the new state machine
update public.simuls set status = 'open' where status in ('pending', 'open');
update public.simuls set status = 'running' where status in ('active', 'running');
update public.simuls set status = 'finished' where status in ('completed', 'cancelled', 'closed');
update public.simuls set status = 'draft' where status not in ('draft', 'open', 'running', 'finished');

alter table public.simuls drop constraint if exists simuls_status_check;
alter table public.simuls add constraint simuls_status_check check (status in ('draft', 'open', 'running', 'finished'));
alter table public.simuls alter column status set default 'draft';

-- Rename guest column to challenger for clarity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='simul_tables' AND column_name='guest_id') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='simul_tables' AND column_name='challenger_id') THEN
        ALTER TABLE public.simul_tables RENAME COLUMN guest_id TO challenger_id;
    END IF;
END $$;

-- Normalize table statuses
update public.simul_tables set status = 'open' where status in ('free', 'open');
update public.simul_tables set status = 'playing' where status in ('reserved', 'playing');
update public.simul_tables set status = 'done' where status in ('completed', 'cancelled', 'done');

alter table public.simul_tables drop constraint if exists simul_tables_status_check;
alter table public.simul_tables add constraint simul_tables_status_check check (status in ('open', 'playing', 'done'));
alter table public.simul_tables alter column status set default 'open';

-- Refresh challenger index
drop index if exists idx_simul_tables_guest;
create index if not exists idx_simul_tables_challenger on public.simul_tables(challenger_id);

-- Optional invitations table for targeted seats
create table if not exists public.simul_invites (
  simul_id uuid references public.simuls(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (simul_id, invited_user_id)
);

alter table public.simul_invites enable row level security;

-- Policies: host manages everything on their simul; challengers can claim open tables

drop policy if exists "Simuls selectable by host or guest" on public.simuls;
drop policy if exists "Simuls insert by host" on public.simuls;
drop policy if exists "Simuls update by host" on public.simuls;
drop policy if exists "Simuls delete by host" on public.simuls;

create policy "Simuls selectable by host or challenger" on public.simuls
  for select using (
    host_id = auth.uid()
    or exists (
      select 1 from public.simul_tables st
      where st.simul_id = simuls.id and st.challenger_id = auth.uid()
    )
  );

create policy "Simuls insert by host" on public.simuls
  for insert with check (host_id = auth.uid());

create policy "Simuls update by host" on public.simuls
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

create policy "Simuls delete by host" on public.simuls
  for delete using (host_id = auth.uid());

-- Simul tables policies

drop policy if exists "Simul tables selectable by host or guest" on public.simul_tables;
drop policy if exists "Simul tables insert by host" on public.simul_tables;
drop policy if exists "Simul tables update by host" on public.simul_tables;
drop policy if exists "Simul tables delete by host" on public.simul_tables;

create policy "Simul tables selectable for lobby" on public.simul_tables
  for select using (
    status = 'open'
    or challenger_id = auth.uid()
    or exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );

create policy "Simul tables insert by host" on public.simul_tables
  for insert with check (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );

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

create policy "Simul tables joinable by challenger" on public.simul_tables
  for update using (
    status = 'open' and challenger_id is null
  )
  with check (
    challenger_id = auth.uid() and status = 'playing'
  );

create policy "Simul tables delete by host" on public.simul_tables
  for delete using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );

-- Invitations: host-only management

drop policy if exists "Simul invites insert by host" on public.simul_invites;
drop policy if exists "Simul invites select by host" on public.simul_invites;
drop policy if exists "Simul invites delete by host" on public.simul_invites;

create policy "Simul invites select by host" on public.simul_invites
  for select using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_invites.simul_id and s.host_id = auth.uid()
    )
  );

create policy "Simul invites insert by host" on public.simul_invites
  for insert with check (
    exists (
      select 1 from public.simuls s
      where s.id = simul_invites.simul_id and s.host_id = auth.uid()
    )
  );

create policy "Simul invites delete by host" on public.simul_invites
  for delete using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_invites.simul_id and s.host_id = auth.uid()
    )
  );
