-- Round-robin simul sessions (private)

create table if not exists public.simul_round_robin_sessions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  status text not null check (status in ('draft', 'started', 'completed')) default 'draft',
  created_at timestamptz not null default now(),
  started_at timestamptz
);

create table if not exists public.simul_round_robin_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.simul_round_robin_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('active', 'left')) default 'active',
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.simul_round_robin_game_links (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.simul_round_robin_sessions(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  white_id uuid not null references public.profiles(id) on delete cascade,
  black_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (white_id <> black_id),
  unique (session_id, white_id, black_id)
);

create index if not exists idx_rr_sessions_organizer on public.simul_round_robin_sessions(organizer_id);
create index if not exists idx_rr_participants_session on public.simul_round_robin_participants(session_id);
create index if not exists idx_rr_participants_user on public.simul_round_robin_participants(user_id);
create index if not exists idx_rr_game_links_session on public.simul_round_robin_game_links(session_id);

alter table public.simul_round_robin_sessions enable row level security;
alter table public.simul_round_robin_participants enable row level security;
alter table public.simul_round_robin_game_links enable row level security;

-- Sessions: public read, restricted write
create policy "RR sessions selectable" on public.simul_round_robin_sessions
  for select using (true);

create policy "RR sessions insert by organizer" on public.simul_round_robin_sessions
  for insert with check (organizer_id = auth.uid());

create policy "RR sessions update by organizer" on public.simul_round_robin_sessions
  for update using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

-- Participants: organizer or participant can view; insert only if session is draft
create policy "RR participants selectable" on public.simul_round_robin_participants
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.simul_round_robin_sessions s
      where s.id = simul_round_robin_participants.session_id and s.organizer_id = auth.uid()
    )
  );

create policy "RR participants insert" on public.simul_round_robin_participants
  for insert with check (
    exists (
      select 1 from public.simul_round_robin_sessions s
      where s.id = simul_round_robin_participants.session_id and s.status = 'draft'
    )
  );

create policy "RR participants update by organizer" on public.simul_round_robin_participants
  for update using (
    exists (
      select 1 from public.simul_round_robin_sessions s
      where s.id = simul_round_robin_participants.session_id and s.organizer_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.simul_round_robin_sessions s
      where s.id = simul_round_robin_participants.session_id and s.organizer_id = auth.uid()
    )
  );

-- Game links: organizer or participants can view
create policy "RR game links selectable" on public.simul_round_robin_game_links
  for select using (
    white_id = auth.uid()
    or black_id = auth.uid()
    or exists (
      select 1 from public.simul_round_robin_sessions s
      where s.id = simul_round_robin_game_links.session_id and s.organizer_id = auth.uid()
    )
  );

create policy "RR game links insert by organizer" on public.simul_round_robin_game_links
  for insert with check (
    exists (
      select 1 from public.simul_round_robin_sessions s
      where s.id = simul_round_robin_game_links.session_id and s.organizer_id = auth.uid()
    )
  );
