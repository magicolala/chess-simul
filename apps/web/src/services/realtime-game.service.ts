import { Injectable, OnDestroy, inject } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';

export interface GameRow {
  id: string;
  status?: string;
  fen?: string;
  updated_at?: string;
  simul_id?: string | null;
  [key: string]: unknown;
}

export interface MoveRow {
  id: string;
  game_id: string;
  uci?: string;
  san?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface PresenceUser {
  user_id: string;
  username?: string;
}

export interface SimulTableChange {
  gameId: string;
  data: GameRow | null;
}

@Injectable({ providedIn: 'root' })
export class RealtimeGameService implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService).client;

  private gameChannel?: RealtimeChannel;
  private simulChannel?: RealtimeChannel;

  private gameSubject = new BehaviorSubject<GameRow | null>(null);
  private movesSubject = new BehaviorSubject<MoveRow[]>([]);
  private onlinePlayersSubject = new BehaviorSubject<PresenceUser[]>([]);
  private simulTablesSubject = new BehaviorSubject<SimulTableChange[]>([]);

  readonly game$ = this.gameSubject.asObservable();
  readonly moves$ = this.movesSubject.asObservable();
  readonly onlinePlayers$ = this.onlinePlayersSubject.asObservable();
  readonly simulTables$ = this.simulTablesSubject.asObservable();

  subscribeToGame(gameId: string, presence: PresenceUser) {
    if (!gameId) return;

    this.teardownGameChannel();
    this.gameSubject.next(null);
    this.movesSubject.next([]);
    this.onlinePlayersSubject.next([]);

    const channel = this.supabase.channel(`game:${gameId}`, {
      config: {
        presence: { key: presence.user_id }
      }
    });

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload: RealtimePostgresChangesPayload<GameRow>) => {
        this.gameSubject.next(this.coerceGameRow(payload.new));
      }
    );

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
      (payload: RealtimePostgresChangesPayload<MoveRow>) => {
        const nextMoves = [...this.movesSubject.value, payload.new as MoveRow];
        this.movesSubject.next(nextMoves);
      }
    );

    channel.on('presence', { event: 'sync' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'join' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'leave' }, () => this.refreshPresence(channel));

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track(presence);
      }
    });

    this.gameChannel = channel;
  }

  subscribeToSimul(simulId: string, presence?: PresenceUser) {
    if (!simulId) return;

    this.teardownSimulChannel();
    this.simulTablesSubject.next([]);

    const channel = this.supabase.channel(`simul:${simulId}`, {
      config: {
        presence: { key: presence?.user_id ?? `observer-${Date.now()}` }
      }
    });

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `simul_id=eq.${simulId}` },
      (payload: RealtimePostgresChangesPayload<GameRow>) => {
        const newGame = this.coerceGameRow(payload.new);
        const oldGame = this.coerceGameRow(payload.old as Partial<GameRow> | null | undefined);
        const gameId = newGame?.id ?? oldGame?.id;
        if (!gameId) return;
        const next = this.simulTablesSubject.value.filter((g) => g.gameId !== gameId);
        this.simulTablesSubject.next([...next, { gameId, data: newGame }]);
      }
    );

    channel.on('presence', { event: 'sync' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'join' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'leave' }, () => this.refreshPresence(channel));

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && presence) {
        channel.track(presence);
      }
    });

    this.simulChannel = channel;
  }

  preloadMoves(moves: MoveRow[]) {
    this.movesSubject.next(moves);
  }

  preloadGame(game: GameRow | null) {
    this.gameSubject.next(game);
  }

  async submitMove(gameId: string, uci: string) {
    if (!gameId || !uci) {
      throw new Error('gameId and uci are required');
    }

    const { data, error } = await this.supabase.functions.invoke('submit-move', {
      body: { game_id: gameId, uci },
    });

    if (error) {
      throw error;
    }

    return data as
      | {
          data?: {
            move: MoveRow;
            game: GameRow & {
              move_count: number;
              turn: string;
              status: string;
              fen: string;
            };
          };
        }
      | null;
  }

  async teardownGameChannel() {
    if (this.gameChannel) {
      await this.supabase.removeChannel(this.gameChannel);
      this.gameChannel = undefined;
    }
  }

  async teardownSimulChannel() {
    if (this.simulChannel) {
      await this.supabase.removeChannel(this.simulChannel);
      this.simulChannel = undefined;
    }
  }

  ngOnDestroy(): void {
    this.teardownGameChannel();
    this.teardownSimulChannel();
  }

  private refreshPresence(channel: RealtimeChannel) {
    const state = channel.presenceState<PresenceUser>();
    const flattened = Object.values(state).flat();
    this.onlinePlayersSubject.next(flattened);
  }

  private coerceGameRow(row: Partial<GameRow> | null | undefined): GameRow | null {
    if (row && typeof row === 'object' && 'id' in row && typeof row.id === 'string') {
      return row as GameRow;
    }
    return null;
  }
}
