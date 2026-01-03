import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';
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
    if (!sessionId) return;

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
        const next = current.filter((p) => p.id !== payload.old?.id);
        if (payload.new?.id) {
          next.push({
            id: payload.new.id,
            userId: payload.new.user_id,
            status: payload.new.status,
            joinedAt: payload.new.joined_at
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
    if (!gameIds.length) return;

    void this.unsubscribeGames();
    const filter = `id=in.(${gameIds.join(',')})`;
    const channel = this.supabase.channel('rr-games');

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter },
      (payload: RealtimePostgresChangesPayload<RoundRobinGameSummary>) => {
        if (!payload.new?.id || !payload.new?.status) return;
        this.gamesSubject.next({
          ...this.gamesSubject.value,
          [payload.new.id]: payload.new.status as string
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
