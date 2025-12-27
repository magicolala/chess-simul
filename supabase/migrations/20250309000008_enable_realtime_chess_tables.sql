-- Ensure realtime broadcasts for chess tables
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.moves;
alter publication supabase_realtime add table public.simul_tables;
