-- Secure move submissions through server-side enforcement
alter table public.games add column if not exists move_count integer not null default 0;
alter table public.games add column if not exists last_move_uci text;

-- Backfill counters and last move marker from existing rows
with move_totals as (
  select game_id, count(*) as move_count
  from public.moves
  group by game_id
), last_moves as (
  select distinct on (game_id) game_id, uci
  from public.moves
  order by game_id, ply desc, created_at desc
)
update public.games g
set move_count = coalesce(mt.move_count, 0),
    last_move_uci = lm.uci
from move_totals mt
left join last_moves lm on lm.game_id = mt.game_id
where g.id = mt.game_id;

-- Ensure legacy rows without moves are initialized
update public.games
set move_count = 0
where move_count is null;

-- RLS tightening: block direct client mutations
-- Games must be updated via trusted RPC/Edge logic
-- Moves become append-only through the function layer

-- Disable client-side updates on games

drop policy if exists "Games update by host or current player" on public.games;

-- Restrict direct writes to moves

drop policy if exists "Moves insertable by participants" on public.moves;
drop policy if exists "Moves updatable by participants" on public.moves;
drop policy if exists "Moves deletable by participants" on public.moves;
