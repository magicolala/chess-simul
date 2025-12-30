-- Allow users to create their own profile rows (needed for initial sign-in flows).
drop policy if exists "Profiles are insertable by owner" on public.profiles;

create policy "Profiles are insertable by owner" on public.profiles
  for insert
  with check (auth.uid() = id);
