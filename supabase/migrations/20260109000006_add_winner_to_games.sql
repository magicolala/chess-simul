-- Add winner_id to games to track resignation and distinct winners
-- This is useful when the result isn't implicit from checkmate turn.

alter table public.games
  add column if not exists winner_id uuid references public.profiles(id);

create index if not exists idx_games_winner on public.games(winner_id);
