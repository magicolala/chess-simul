import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class HydraMatchmakingService {
  private readonly supabase = inject(SupabaseClientService).client;

  async joinQueue(tournamentId: string, elo: number, maxGames: number) {
    const { data, error } = await this.supabase.functions.invoke('hydra-matchmaking', {
      method: 'POST',
      body: { tournamentId, elo, maxGames },
      headers: { 'x-path': '/queue/join' }
    });

    if (error) {
      throw error;
    }

    return data as { status: string; eloMin?: number; eloMax?: number };
  }

  async leaveQueue(tournamentId: string) {
    const { data, error } = await this.supabase.functions.invoke('hydra-matchmaking', {
      method: 'POST',
      body: { tournamentId },
      headers: { 'x-path': '/queue/leave' }
    });

    if (error) {
      throw error;
    }

    return data as { status: string };
  }

  async fetchQueueStatus() {
    const { data, error } = await this.supabase.functions.invoke('hydra-matchmaking', {
      method: 'GET',
      headers: { 'x-path': '/queue/status' }
    });

    if (error) {
      throw error;
    }

    return data as { status: string; eloMin?: number; eloMax?: number };
  }
}
