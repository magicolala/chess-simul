import { Injectable, type OnDestroy, inject } from '@angular/core';
import { type RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';
import type { Database } from '@supabase/types/database.types';

type HydraGameRow = Database['public']['Tables']['hydra_games']['Row'];
type HydraParticipantRow = Database['public']['Tables']['hydra_tournament_participants']['Row'];
type HydraScoreEventRow = Database['public']['Tables']['hydra_score_events']['Row'];

@Injectable({ providedIn: 'root' })
export class HydraRealtimeService implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService).client;
  private channel?: RealtimeChannel;

  private gamesSubject = new BehaviorSubject<HydraGameRow[]>([]);
  private participantsSubject = new BehaviorSubject<HydraParticipantRow[]>([]);
  private scoreEventsSubject = new BehaviorSubject<HydraScoreEventRow[]>([]);

  readonly games$ = this.gamesSubject.asObservable();
  readonly participants$ = this.participantsSubject.asObservable();
  readonly scoreEvents$ = this.scoreEventsSubject.asObservable();

  subscribe(tournamentId: string) {
    if (!tournamentId) {
      return;
    }

    void this.teardown();

    const channel = this.supabase.channel(`hydra-tournament:${tournamentId}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hydra_games',
        filter: `tournament_id=eq.${tournamentId}`
      },
      (payload: RealtimePostgresChangesPayload<HydraGameRow>) => {
        this.mergeRow(this.gamesSubject, payload.new as HydraGameRow, payload.eventType);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hydra_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      },
      (payload: RealtimePostgresChangesPayload<HydraParticipantRow>) => {
        this.mergeRow(
          this.participantsSubject,
          payload.new as HydraParticipantRow,
          payload.eventType
        );
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hydra_score_events',
        filter: `tournament_id=eq.${tournamentId}`
      },
      (payload: RealtimePostgresChangesPayload<HydraScoreEventRow>) => {
        const existing = this.scoreEventsSubject.value;
        this.scoreEventsSubject.next([payload.new as HydraScoreEventRow, ...existing]);
      }
    );

    channel.subscribe();
    this.channel = channel;
  }

  preloadGames(games: HydraGameRow[]) {
    this.gamesSubject.next(games ?? []);
  }

  async teardown() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = undefined;
    }
    this.gamesSubject.next([]);
    this.participantsSubject.next([]);
    this.scoreEventsSubject.next([]);
  }

  ngOnDestroy(): void {
    void this.teardown();
  }

  private mergeRow<T extends { id: string }>(
    subject: BehaviorSubject<T[]>,
    row: T,
    eventType: string
  ) {
    const existing = new Map(subject.value.map((entry) => [entry.id, entry]));

    if (eventType === 'DELETE') {
      existing.delete(row.id);
    } else {
      existing.set(row.id, row);
    }

    subject.next(Array.from(existing.values()));
  }
}
