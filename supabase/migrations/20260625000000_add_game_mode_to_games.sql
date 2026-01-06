-- Add game_mode column to identify game variants
alter table public.games
  add column if not exists game_mode text not null default 'standard';
