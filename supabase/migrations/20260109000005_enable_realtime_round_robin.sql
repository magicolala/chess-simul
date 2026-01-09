-- Enable realtime for Round-Robin tables
alter publication supabase_realtime add table public.simul_round_robin_sessions;
alter publication supabase_realtime add table public.simul_round_robin_participants;
alter publication supabase_realtime add table public.simul_round_robin_game_links;
