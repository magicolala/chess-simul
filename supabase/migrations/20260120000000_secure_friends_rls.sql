-- Enforce RLS and policies for the friends table

alter table public.friends enable row level security;

-- RLS policies

drop policy if exists "Friends visible to participants" on public.friends;
drop policy if exists "Friends insertable by initiator" on public.friends;
drop policy if exists "Friends modifiable by participants" on public.friends;
drop policy if exists "Friends removable by participants" on public.friends;

create policy "Friends visible to participants" on public.friends
  for select
  to authenticated
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "Friends insertable by initiator" on public.friends
  for insert
  to authenticated
  with check (
    auth.uid() = action_user_id
    and (auth.uid() = user_id_1 or auth.uid() = user_id_2)
  );

create policy "Friends modifiable by participants" on public.friends
  for update
  to authenticated
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2)
  with check (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "Friends removable by participants" on public.friends
  for delete
  to authenticated
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Indexes to support policy lookups
create index if not exists idx_friends_user_id_1 on public.friends(user_id_1);
create index if not exists idx_friends_user_id_2 on public.friends(user_id_2);
