import { Injectable, OnDestroy, inject } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { GameRow, MoveRow, PresenceUser, SimulTableRow } from '../models/realtime.model';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class RealtimeSimulService implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService).client;

  private channel?: RealtimeChannel;
  private currentSimulId?: string;

  private tablesSubject = new BehaviorSubject<SimulTableRow[]>([]);
  private gamesSubject = new BehaviorSubject<GameRow[]>([]);
  private movesSubject = new BehaviorSubject<MoveRow[]>([]);
  private presenceSubject = new BehaviorSubject<PresenceUser[]>([]);

  readonly tables$ = this.tablesSubject.asObservable();
  readonly games$ = this.gamesSubject.asObservable();
  readonly moves$ = this.movesSubject.asObservable();
  readonly presence$ = this.presenceSubject.asObservable();

  subscribe(simulId: string, presence?: PresenceUser) {
    if (!simulId) return;

    void this.teardown();
    this.currentSimulId = simulId;
    this.resetState();

    const presencePayload: PresenceUser = presence ?? {
      user_id: `observer-${Date.now()}`,
      username: 'Observateur'
    };

    const channel = this.supabase.channel(`simul:${simulId}`, {
      config: {
        presence: { key: presencePayload.user_id }
      }
    });

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'simul_tables',
        filter: `simul_id=eq.${simulId}`
      },
      (payload: RealtimePostgresChangesPayload<SimulTableRow>) => {
        this.upsertTable(payload.new as SimulTableRow);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `simul_id=eq.${simulId}`
      },
      (payload: RealtimePostgresChangesPayload<GameRow>) => {
        this.upsertGame(payload.new as GameRow);
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'games',
        filter: `simul_id=eq.${simulId}`
      },
      (payload: RealtimePostgresChangesPayload<GameRow>) => {
        this.upsertGame(payload.new as GameRow);
      }
    );

    channel.on('presence', { event: 'sync' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'join' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'leave' }, () => this.refreshPresence(channel));

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track(presencePayload);
      }
    });

    this.channel = channel;
  }

  preloadTables(tables: SimulTableRow[]) {
    this.tablesSubject.next(this.sortTables(tables));
  }

  async teardown() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = undefined;
    }
    this.currentSimulId = undefined;
    this.resetState();
  }

  ngOnDestroy(): void {
    void this.teardown();
  }

  private upsertTable(table: SimulTableRow | null) {
    if (!table?.id) return;

    const nextTables = [...this.tablesSubject.value.filter((t) => t.id !== table.id), table];
    this.tablesSubject.next(this.sortTables(nextTables));
  }

  private upsertGame(game: GameRow | null) {
    if (!game?.id) return;
    const nextGames = [...this.gamesSubject.value.filter((g) => g.id !== game.id), game];
    this.gamesSubject.next(nextGames);
  }

  private refreshPresence(channel: RealtimeChannel) {
    const state = channel.presenceState<PresenceUser>();
    const flattened = Object.values(state).flat();
    this.presenceSubject.next(flattened);
  }

  private sortTables(tables: SimulTableRow[]) {
    return [...tables].sort((a, b) => (a.seat_no ?? 0) - (b.seat_no ?? 0));
  }

  private resetState() {
    this.tablesSubject.next([]);
    this.gamesSubject.next([]);
    this.movesSubject.next([]);
    this.presenceSubject.next([]);
  }
}
