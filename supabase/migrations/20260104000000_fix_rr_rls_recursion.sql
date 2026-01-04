-- Fix infinite recursion in round-robin simul RLS policies

create or replace function public.is_rr_session_organizer(session_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.simul_round_robin_sessions s
    where s.id = session_uuid
      and s.organizer_id = auth.uid()
  );
$$;

create or replace function public.is_rr_session_participant(session_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.simul_round_robin_participants p
    where p.session_id = session_uuid
      and p.user_id = auth.uid()
  );
$$;

create or replace function public.is_rr_session_draft(session_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.simul_round_robin_sessions s
    where s.id = session_uuid
      and s.status = 'draft'
  );
$$;

grant execute on function public.is_rr_session_organizer(uuid) to anon, authenticated;
grant execute on function public.is_rr_session_participant(uuid) to anon, authenticated;
grant execute on function public.is_rr_session_draft(uuid) to anon, authenticated;

drop policy if exists "RR sessions selectable" on public.simul_round_robin_sessions;
create policy "RR sessions selectable" on public.simul_round_robin_sessions
  for select using (
    organizer_id = auth.uid()
    or public.is_rr_session_participant(id)
  );

drop policy if exists "RR participants selectable" on public.simul_round_robin_participants;
create policy "RR participants selectable" on public.simul_round_robin_participants
  for select using (
    user_id = auth.uid()
    or public.is_rr_session_organizer(session_id)
  );

drop policy if exists "RR participants insert" on public.simul_round_robin_participants;
create policy "RR participants insert" on public.simul_round_robin_participants
  for insert with check (public.is_rr_session_draft(session_id));

drop policy if exists "RR participants update by organizer" on public.simul_round_robin_participants;
create policy "RR participants update by organizer" on public.simul_round_robin_participants
  for update using (public.is_rr_session_organizer(session_id))
  with check (public.is_rr_session_organizer(session_id));

drop policy if exists "RR game links selectable" on public.simul_round_robin_game_links;
create policy "RR game links selectable" on public.simul_round_robin_game_links
  for select using (
    white_id = auth.uid()
    or black_id = auth.uid()
    or public.is_rr_session_organizer(session_id)
  );

drop policy if exists "RR game links insert by organizer" on public.simul_round_robin_game_links;
create policy "RR game links insert by organizer" on public.simul_round_robin_game_links
  for insert with check (public.is_rr_session_organizer(session_id));
