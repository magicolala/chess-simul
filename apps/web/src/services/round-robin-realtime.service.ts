import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { type RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { type SupabaseClientService } from './supabase-client.service';
import type { RoundRobinParticipant, RoundRobinGameSummary } from '@chess-simul/shared';

@Injectable({ providedIn: 'root' })
export class RoundRobinRealtimeService {
  private readonly supabase = this.supabaseClient.client;
  private rosterChannel?: RealtimeChannel;
  private gamesChannel?: RealtimeChannel;

  private rosterSubject = new BehaviorSubject<RoundRobinParticipant[]>([]);
  private gamesSubject = new BehaviorSubject<Record<string, string>>({});

  readonly roster$ = this.rosterSubject.asObservable();
  readonly gameStatus$ = this.gamesSubject.asObservable();

  constructor(private supabaseClient: SupabaseClientService) {}

  subscribeRoster(sessionId: string) {
    if (!sessionId) {
      return;
    }

    void this.unsubscribeRoster();
    const channel = this.supabase.channel(`rr-roster:${sessionId}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'simul_round_robin_participants',
        filter: `session_id=eq.${sessionId}`
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const current = this.rosterSubject.value;
        const oldRow = (payload.old ?? null) as Record<string, unknown> | null;
        const newRow = (payload.new ?? null) as Record<string, unknown> | null;
        const next = current.filter((p) => p.id !== (oldRow?.id as string | undefined));
        if (newRow?.id) {
          next.push({
            id: newRow.id as string,
            userId: newRow.user_id as string,
            status: newRow.status as RoundRobinParticipant['status'],
            joinedAt: newRow.joined_at as string
          });
        }
        this.rosterSubject.next(next);
      }
    );

    channel.subscribe();
    this.rosterChannel = channel;
  }

  seedRoster(participants: RoundRobinParticipant[]) {
    this.rosterSubject.next([...participants]);
  }

  subscribeGames(gameIds: string[]) {
    if (!gameIds.length) {
      return;
    }

    void this.unsubscribeGames();
    const filter = `id=in.(${gameIds.join(',')})`;
    const channel = this.supabase.channel('rr-games');

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const newRow = (payload.new ?? null) as Record<string, unknown> | null;
        const id = newRow?.id as string | undefined;
        const status = newRow?.status as string | undefined;
        if (!id || !status) {
          return;
        }
        this.gamesSubject.next({
          ...this.gamesSubject.value,
          [id]: status
        });
      }
    );

    channel.subscribe();
    this.gamesChannel = channel;
  }

  seedGameStatus(games: RoundRobinGameSummary[]) {
    const next: Record<string, string> = {};
    games.forEach((game) => {
      const key = game.gameId ?? game.id;
      if (key && game.status) {
        next[key] = game.status;
      }
    });
    this.gamesSubject.next(next);
  }

  async unsubscribeRoster() {
    if (this.rosterChannel) {
      await this.supabase.removeChannel(this.rosterChannel);
      this.rosterChannel = undefined;
    }
    this.rosterSubject.next([]);
  }

  async unsubscribeGames() {
    if (this.gamesChannel) {
      await this.supabase.removeChannel(this.gamesChannel);
      this.gamesChannel = undefined;
    }
    this.gamesSubject.next({});
  }
}
