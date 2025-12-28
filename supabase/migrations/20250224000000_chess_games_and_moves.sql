-- Align games schema to chess needs
update public.games set status = 'active' where status = 'playing';
update public.games set status = 'aborted' where status not in ('waiting', 'active');

alter table public.games drop constraint if exists games_status_check;
alter table public.games drop constraint if exists games_turn_color_check;

alter table public.games rename column turn_color to turn;
update public.games
set turn = case turn when 'white' then 'w' when 'black' then 'b' else 'w' end;

alter table public.games alter column turn set default 'w';
alter table public.games add constraint games_turn_check check (turn in ('w','b'));
alter table public.games alter column fen set default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
alter table public.games alter column status set default 'waiting';

drop policy if exists "Games selectable by participants" on public.games;
alter table public.games drop column if exists mode;
drop policy if exists "Games insert by participants" on public.games;
drop policy if exists "Games update by host or current player" on public.games;
alter table public.games drop column if exists host_id;
alter table public.games drop column if exists pgn;
alter table public.games drop column if exists last_move_at;

alter table public.games add column if not exists last_move_uci text;
alter table public.games add column if not exists move_count integer not null default 0;
alter table public.games add column if not exists clocks jsonb;

alter table public.games add constraint games_status_check check (status in ('waiting','active','checkmate','draw','resigned','aborted'));

-- Rebuild moves table to match chess usage
drop table if exists public.moves cascade;
create table public.moves (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply int not null check (ply > 0),
  uci text not null,
  san text,
  fen_after text not null,
  played_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

-- Indexes
create index if not exists idx_games_white on public.games(white_id);
create index if not exists idx_games_black on public.games(black_id);
create index if not exists idx_games_simul on public.games(simul_id);
create index if not exists idx_moves_game_ply on public.moves(game_id, ply);

drop index if exists idx_games_host;
drop index if exists idx_games_last_move_at;

-- Participation helper including simul host
create or replace function public.is_game_participant(gid uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.games g
    left join public.simuls s on s.id = g.simul_id
    where g.id = gid
      and (
        g.white_id = auth.uid()
        or g.black_id = auth.uid()
        or (g.simul_id is not null and s.host_id = auth.uid())
      )
  );
$$;

-- Policies
alter table public.games enable row level security;
alter table public.moves enable row level security;

drop policy if exists "Games selectable by participants" on public.games;
drop policy if exists "Games insert by participants" on public.games;
drop policy if exists "Games update by host or current player" on public.games;

drop policy if exists "Moves selectable by participants" on public.moves;
drop policy if exists "Moves insertable by participants" on public.moves;
drop policy if exists "Moves updatable by participants" on public.moves;
drop policy if exists "Moves deletable by participants" on public.moves;

create policy "Games selectable by participants" on public.games
  for select using (public.is_game_participant(id));

create policy "Games insertable by participants" on public.games
  for insert with check (
    (white_id = auth.uid() or black_id = auth.uid())
    or (
      simul_id is not null and exists (
        select 1 from public.simuls s where s.id = simul_id and s.host_id = auth.uid()
      )
    )
  );

create policy "Games updatable by participants" on public.games
  for update using (public.is_game_participant(id)) with check (public.is_game_participant(id));

create policy "Moves selectable by participants" on public.moves
  for select using (public.is_game_participant(game_id));

create policy "Moves insertable by participants" on public.moves
  for insert with check (public.is_game_participant(game_id));

-- Trigger to sync game after move
create or replace function public.update_game_after_move()
returns trigger
language plpgsql
as $$
begin
  update public.games
  set fen = NEW.fen_after,
      last_move_uci = NEW.uci,
      turn = case when (NEW.ply % 2) = 0 then 'w' else 'b' end,
      move_count = NEW.ply,
      updated_at = now()
  where id = NEW.game_id;

  return NEW;
end;
$$;

drop trigger if exists trg_moves_update_game on public.moves;
create trigger trg_moves_update_game
  after insert on public.moves
  for each row
  execute function public.update_game_after_move();

-- Start simul game helper aligned with new schema
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

  insert into public.games (simul_id, white_id, black_id, status, turn, fen)
  values (st.simul_id, st.host_id, st.guest_id, 'active', 'w', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
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
