import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import type { Database } from '@supabase/types/database.types';

export type HydraTournamentRow = Database['public']['Tables']['hydra_tournaments']['Row'];
export type HydraParticipantRow = Database['public']['Tables']['hydra_tournament_participants']['Row'];
export type HydraGameRow = Database['public']['Tables']['hydra_games']['Row'];

@Injectable({ providedIn: 'root' })
export class HydraTournamentService {
  private readonly supabase = inject(SupabaseClientService).client;

  async getTournament(tournamentId: string) {
    return this.supabase
      .from('hydra_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle();
  }

  async joinTournament(tournamentId: string) {
    const { data: auth } = await this.supabase.auth.getUser();
    if (!auth?.user) {
      throw new Error('Not authenticated');
    }

    const { data: tournament } = await this.supabase
      .from('hydra_tournaments')
      .select('type, survival_lives_default')
      .eq('id', tournamentId)
      .maybeSingle();

    const livesDefault =
      tournament?.type === 'survival' ? tournament.survival_lives_default ?? 3 : null;

    return this.supabase
      .from('hydra_tournament_participants')
      .upsert(
        {
          tournament_id: tournamentId,
          user_id: auth.user.id,
          score: 0,
          lives_remaining: livesDefault,
        },
        { onConflict: 'tournament_id,user_id' }
      )
      .select('*')
      .maybeSingle();
  }

  async fetchLeaderboard(tournamentId: string) {
    return this.supabase
      .from('hydra_tournament_participants')
      .select('user_id, score, eliminated_at')
      .eq('tournament_id', tournamentId)
      .order('score', { ascending: false })
      .order('eliminated_at', { ascending: true, nullsFirst: false });
  }

  async fetchActiveGames(tournamentId: string) {
    const { data: auth } = await this.supabase.auth.getUser();
    if (!auth?.user) {
      throw new Error('Not authenticated');
    }

    return this.supabase
      .from('hydra_games')
      .select('*')
      .eq('tournament_id', tournamentId)
      .or(`white_player_id.eq.${auth.user.id},black_player_id.eq.${auth.user.id}`)
      .in('status', ['pending', 'active']);
  }
}
