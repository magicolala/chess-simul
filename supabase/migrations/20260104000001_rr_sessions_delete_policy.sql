-- Allow organizers to delete draft round-robin sessions

drop policy if exists "RR sessions delete by organizer" on public.simul_round_robin_sessions;
create policy "RR sessions delete by organizer" on public.simul_round_robin_sessions
  for delete using (organizer_id = auth.uid());
