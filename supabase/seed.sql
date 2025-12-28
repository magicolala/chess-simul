-- Development seed for chess simuls; executes only if auth.users already has accounts
-- The script picks the first three auth users (host + two guests) and seeds demo data.

with host_user as (
  select id from auth.users order by created_at limit 1
), guest1 as (
  select id from auth.users order by created_at offset 1 limit 1
), guest2 as (
  select id from auth.users order by created_at offset 2 limit 1
), upsert_profiles as (
  insert into public.profiles (id, username, avatar_url)
  select id, 'host_player', 'https://example.com/host.png' from host_user
  union all
  select id, 'guest_one', 'https://example.com/guest1.png' from guest1
  union all
  select id, 'guest_two', 'https://example.com/guest2.png' from guest2
  on conflict (id) do update set username = excluded.username, avatar_url = excluded.avatar_url
  returning id
), upsert_settings as (
  insert into public.user_settings (user_id, theme, board_style, piece_style, sound, notation)
  select id, 'dark', 'neo', 'alpha', true, 'algebraic' from host_user
  union all
  select id, 'light', 'classic', 'merida', true, 'algebraic' from guest1
  union all
  select id, 'dark', 'wood', 'cburnett', false, 'algebraic' from guest2
  on conflict (user_id) do update set theme = excluded.theme, board_style = excluded.board_style, piece_style = excluded.piece_style, sound = excluded.sound
  returning user_id
), simul_seed as (
  insert into public.simuls (host_id, name, status)
  select id, 'Friday Simul', 'running' from host_user
  on conflict do nothing
  returning id as simul_id
), game_seed as (
  insert into public.games (simul_id, white_id, black_id, status, turn, fen, move_count, last_move_uci)
  select simul_id, h.id, g1.id, 'active', 'b', 'rnbqkbnr/pppp1ppp/8/4p3/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 2, 'e7e5'
  from simul_seed s
  join host_user h on true
  join guest1 g1 on true
  union all
  select simul_id, h.id, g2.id, 'waiting', 'w', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 0, null
  from simul_seed s
  join host_user h on true
  join guest2 g2 on true
  on conflict do nothing
  returning id, simul_id
), table_seed as (
  insert into public.simul_tables (simul_id, challenger_id, game_id, seat_no, status)
  select g.simul_id, g1.id, g.id, 1, 'playing' from game_seed g
  join guest1 g1 on true
  union all
  select g.simul_id, g2.id, g.id, 2, 'free' from game_seed g
  join guest2 g2 on true
  on conflict do nothing
  returning game_id
)
insert into public.moves (game_id, ply, san, uci, fen_after, played_by)
select game_id, 1, 'e3', 'e2e3', 'rnbqkbnr/pppp1ppp/8/4p3/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1', h.id
from table_seed ts
join host_user h on true
on conflict do nothing;
