-- Restrict direct writes on chess state to backend functions

drop policy if exists "Games updatable by participants" on public.games;
create policy "Games updatable via service role" on public.games
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Moves insertable by participants" on public.moves;
create policy "Moves insertable via service role" on public.moves
  for insert
  with check (auth.role() = 'service_role');
