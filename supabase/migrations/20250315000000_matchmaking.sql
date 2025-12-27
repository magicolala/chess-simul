-- Multiplayer matchmaking primitives

create table if not exists public.match_queue (
  id uuid primary key default public.default_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  time_control text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create index if not exists idx_match_queue_time_control on public.match_queue (time_control, created_at);

create trigger handle_match_queue_timestamps
  before insert or update on public.match_queue
  for each row execute function public.handle_timestamps();

alter table public.match_queue enable row level security;

create policy "Match queue visible to owner" on public.match_queue
  for select using (auth.uid() = user_id);

create policy "Match queue insert by owner" on public.match_queue
  for insert with check (auth.uid() = user_id);

create policy "Match queue update by owner" on public.match_queue
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Match queue delete by owner" on public.match_queue
  for delete using (auth.uid() = user_id);

create table if not exists public.invites (
  id uuid primary key default public.default_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  time_control text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_invites_to_user on public.invites (to_user);
create index if not exists idx_invites_from_user on public.invites (from_user);
create unique index if not exists idx_invites_pending_unique on public.invites (from_user, to_user) where status = 'pending';

create trigger handle_invites_timestamps
  before insert or update on public.invites
  for each row execute function public.handle_timestamps();

alter table public.invites enable row level security;

create policy "Invites visible to participants" on public.invites
  for select using (auth.uid() in (from_user, to_user));

create policy "Invites insertable by sender" on public.invites
  for insert with check (auth.uid() = from_user);

create policy "Invites updateable by participants" on public.invites
  for update using (auth.uid() in (from_user, to_user))
  with check (auth.uid() in (from_user, to_user));

create policy "Invites deletable by sender" on public.invites
  for delete using (auth.uid() = from_user);
