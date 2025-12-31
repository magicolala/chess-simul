-- Align Hydra tables with shared timestamp and UUID defaults

-- hydra_tournaments timestamps and defaults
update public.hydra_tournaments
set
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.hydra_tournaments
  alter column id set default public.default_uuid(),
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null,
  alter column updated_at set default timezone('utc', now()),
  alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'handle_hydra_tournaments_timestamps') then
    create trigger handle_hydra_tournaments_timestamps
      before insert or update on public.hydra_tournaments
      for each row execute function public.handle_timestamps();
  end if;
end $$;

-- hydra_games timestamps and defaults
update public.hydra_games
set
  created_at = coalesce(created_at, timezone('utc', now()));

alter table public.hydra_games
  alter column id set default public.default_uuid(),
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null;

alter table public.hydra_games
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.hydra_games
set
  updated_at = coalesce(updated_at, created_at, timezone('utc', now()));

alter table public.hydra_games
  alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'handle_hydra_games_timestamps') then
    create trigger handle_hydra_games_timestamps
      before insert or update on public.hydra_games
      for each row execute function public.handle_timestamps();
  end if;
end $$;

-- hydra_game_pgn timestamps and defaults
update public.hydra_game_pgn
set
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.hydra_game_pgn
  alter column id set default public.default_uuid(),
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null,
  alter column updated_at set default timezone('utc', now()),
  alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'handle_hydra_game_pgn_timestamps') then
    create trigger handle_hydra_game_pgn_timestamps
      before insert or update on public.hydra_game_pgn
      for each row execute function public.handle_timestamps();
  end if;
end $$;

-- hydra_score_events timestamps and defaults
update public.hydra_score_events
set
  created_at = coalesce(created_at, timezone('utc', now()));

alter table public.hydra_score_events
  alter column id set default public.default_uuid(),
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null;

alter table public.hydra_score_events
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.hydra_score_events
set
  updated_at = coalesce(updated_at, created_at, timezone('utc', now()));

alter table public.hydra_score_events
  alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'handle_hydra_score_events_timestamps') then
    create trigger handle_hydra_score_events_timestamps
      before insert or update on public.hydra_score_events
      for each row execute function public.handle_timestamps();
  end if;
end $$;

-- hydra_matchmaking_events timestamps and defaults
update public.hydra_matchmaking_events
set
  created_at = coalesce(created_at, timezone('utc', now()));

alter table public.hydra_matchmaking_events
  alter column id set default public.default_uuid(),
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null;

alter table public.hydra_matchmaking_events
  add column if not exists updated_at timestamptz default timezone('utc', now());

update public.hydra_matchmaking_events
set
  updated_at = coalesce(updated_at, created_at, timezone('utc', now()));

alter table public.hydra_matchmaking_events
  alter column updated_at set not null;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'handle_hydra_matchmaking_events_timestamps') then
    create trigger handle_hydra_matchmaking_events_timestamps
      before insert or update on public.hydra_matchmaking_events
      for each row execute function public.handle_timestamps();
  end if;
end $$;
