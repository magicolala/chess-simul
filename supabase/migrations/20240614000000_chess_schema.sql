-- Enable required extensions
create extension if not exists "pgcrypto";

-- Profiles table (linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- User settings
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text default 'light',
  board_style text default 'classic',
  piece_style text default 'standard',
  sound boolean default true,
  notation text default 'algebraic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simultaneous exhibitions (host vs many)
create table if not exists public.simuls (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null check (status in ('pending','active','completed','cancelled')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Games (multi or simul-linked)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('multi','simul')),
  simul_id uuid references public.simuls(id) on delete set null,
  host_id uuid references public.profiles(id) on delete set null,
  white_id uuid not null references public.profiles(id) on delete cascade,
  black_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','active','draw','white_won','black_won','cancelled')) default 'pending',
  turn_color text not null check (turn_color in ('white','black')) default 'white',
  fen text not null default 'rn1qkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text,
  last_move_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Individual boards within a simul
create table if not exists public.simul_tables (
  id uuid primary key default gen_random_uuid(),
  simul_id uuid not null references public.simuls(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete set null,
  game_id uuid references public.games(id) on delete set null,
  seat_no int not null,
  status text not null check (status in ('open','seated','active','completed','cancelled')) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (simul_id, seat_no)
);

-- Moves per game
create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  ply int not null check (ply > 0),
  san text,
  uci text,
  fen text,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

-- Indexes to optimize lookups
create index if not exists idx_games_host on public.games(host_id);
create index if not exists idx_games_white on public.games(white_id);
create index if not exists idx_games_black on public.games(black_id);
create index if not exists idx_games_simul on public.games(simul_id);
create index if not exists idx_games_last_move_at on public.games(last_move_at);

create index if not exists idx_simuls_host on public.simuls(host_id);
create index if not exists idx_simul_tables_simul on public.simul_tables(simul_id);
create index if not exists idx_simul_tables_guest on public.simul_tables(guest_id);
create index if not exists idx_moves_game on public.moves(game_id);
create index if not exists idx_moves_created on public.moves(created_at);

-- Helper functions for RLS
create or replace function public.is_game_participant(gid uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.games g
    left join public.simul_tables st on st.game_id = g.id
    left join public.simuls s on s.id = st.simul_id
    where g.id = gid
      and (
        g.white_id = auth.uid()
        or g.black_id = auth.uid()
        or g.host_id = auth.uid()
        or (g.mode = 'simul' and (st.guest_id = auth.uid() or s.host_id = auth.uid()))
      )
  );
$$;

drop policy if exists "Enable full access for authenticated users" on public.profiles;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.simuls enable row level security;
alter table public.simul_tables enable row level security;
alter table public.games enable row level security;
alter table public.moves enable row level security;

-- Profiles policies
create policy "Profiles are selectable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- User settings policies
create policy "User settings CRUD by owner" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Simuls policies
create policy "Simuls selectable by host or guest" on public.simuls
  for select using (
    host_id = auth.uid()
    or exists (
      select 1 from public.simul_tables st
      where st.simul_id = simuls.id and st.guest_id = auth.uid()
    )
  );

create policy "Simuls insert by host" on public.simuls
  for insert with check (host_id = auth.uid());

create policy "Simuls update by host" on public.simuls
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

create policy "Simuls delete by host" on public.simuls
  for delete using (host_id = auth.uid());

-- Simul tables policies
create policy "Simul tables selectable by host or guest" on public.simul_tables
  for select using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
    or guest_id = auth.uid()
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

create policy "Simul tables delete by host" on public.simul_tables
  for delete using (
    exists (
      select 1 from public.simuls s
      where s.id = simul_tables.simul_id and s.host_id = auth.uid()
    )
  );

-- Games policies
create policy "Games selectable by participants" on public.games
  for select using (
    auth.uid() in (host_id, white_id, black_id)
    or (
      mode = 'simul'
      and exists (
        select 1 from public.simul_tables st
        join public.simuls s on s.id = st.simul_id
        where st.game_id = games.id
          and (st.guest_id = auth.uid() or s.host_id = auth.uid())
      )
    )
  );

create policy "Games insert by participants" on public.games
  for insert with check (auth.uid() in (host_id, white_id, black_id));

create policy "Games update by host or current player" on public.games
  for update using (
    host_id = auth.uid()
    or (
      turn_color = 'white' and white_id = auth.uid()
    )
    or (
      turn_color = 'black' and black_id = auth.uid()
    )
  ) with check (
    host_id = auth.uid()
    or (
      turn_color = 'white' and white_id = auth.uid()
    )
    or (
      turn_color = 'black' and black_id = auth.uid()
    )
  );

-- Moves policies
create policy "Moves selectable by participants" on public.moves
  for select using (public.is_game_participant(game_id));

create policy "Moves insertable by participants" on public.moves
  for insert with check (public.is_game_participant(game_id));

create policy "Moves updatable by participants" on public.moves
  for update using (public.is_game_participant(game_id)) with check (public.is_game_participant(game_id));

create policy "Moves deletable by participants" on public.moves
  for delete using (public.is_game_participant(game_id));
