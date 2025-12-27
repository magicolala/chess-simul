import { Injectable, OnDestroy, inject } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { GameRow, MoveRow, PresenceUser } from '../models/realtime.model';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class RealtimeGameService implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService).client;

  private channel?: RealtimeChannel;
  private currentGameId?: string;
  private loadedMoves = 0;
  private defaultPageSize = 25;

  private gameSubject = new BehaviorSubject<GameRow | null>(null);
  private movesSubject = new BehaviorSubject<MoveRow[]>([]);
  private onlinePlayersSubject = new BehaviorSubject<PresenceUser[]>([]);
  private loadingMovesSubject = new BehaviorSubject<boolean>(false);
  private hasMoreMovesSubject = new BehaviorSubject<boolean>(true);

  readonly game$ = this.gameSubject.asObservable();
  readonly moves$ = this.movesSubject.asObservable();
  readonly onlinePlayers$ = this.onlinePlayersSubject.asObservable();
  readonly loadingMoves$ = this.loadingMovesSubject.asObservable();
  readonly hasMoreMoves$ = this.hasMoreMovesSubject.asObservable();

  subscribe(gameId: string, presence?: PresenceUser) {
    if (!gameId) return;

    void this.teardown();
    this.resetState();
    this.currentGameId = gameId;

    const presencePayload: PresenceUser = presence ?? {
      user_id: `observer-${Date.now()}`,
      username: 'Observateur'
    };

    const channel = this.supabase.channel(`game:${gameId}`, {
      config: {
        presence: { key: presencePayload.user_id }
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
        this.mergeMoves([payload.new as MoveRow]);
      }
    );

    channel.on('presence', { event: 'sync' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'join' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'leave' }, () => this.refreshPresence(channel));

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track(presencePayload);
        void this.loadNextMovesPage();
      }
    });

    this.channel = channel;
  }

  async loadNextMovesPage(pageSize = this.defaultPageSize) {
    if (!this.currentGameId || this.loadingMovesSubject.value || !this.hasMoreMovesSubject.value) return;

    this.loadingMovesSubject.next(true);
    const from = this.loadedMoves;
    const to = from + pageSize - 1;

    const { data, error } = await this.supabase
      .from('moves')
      .select('*')
      .eq('game_id', this.currentGameId)
      .order('ply', { ascending: true })
      .range(from, to);

    if (!error && data) {
      this.mergeMoves(data as MoveRow[]);
      if ((data as MoveRow[]).length < pageSize) {
        this.hasMoreMovesSubject.next(false);
      }
    } else if (error) {
      console.error('Failed to load moves', error);
      this.hasMoreMovesSubject.next(false);
    }

    this.loadingMovesSubject.next(false);
  }

  preloadGame(game: GameRow | null) {
    this.gameSubject.next(game);
  }

  preloadMoves(moves: MoveRow[]) {
    this.mergeMoves(moves);
    this.hasMoreMovesSubject.next(false);
  }

  async submitMove(gameId: string, uci: string) {
    const { data, error } = await this.supabase.functions.invoke<{
      success?: boolean;
      fen?: string;
      turn?: 'white' | 'black';
      ply?: number;
      san?: string;
      error?: string;
      message?: string;
    }>('submit-move', {
      body: { game_id: gameId, uci }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async teardown() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = undefined;
    }
    this.currentGameId = undefined;
    this.resetState();
  }

  ngOnDestroy(): void {
    void this.teardown();
  }

  private mergeMoves(incoming: MoveRow[]) {
    if (!incoming || incoming.length === 0) return;

    const existingById = new Map<string, MoveRow>();
    for (const move of this.movesSubject.value) {
      existingById.set(move.id, move);
    }

    for (const move of incoming) {
      if (move?.id) {
        existingById.set(move.id, move);
      }
    }

    const merged = Array.from(existingById.values()).sort((a, b) => (a.ply ?? 0) - (b.ply ?? 0));
    this.movesSubject.next(merged);
    this.loadedMoves = merged.length;
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

  private resetState() {
    this.gameSubject.next(null);
    this.movesSubject.next([]);
    this.onlinePlayersSubject.next([]);
    this.loadingMovesSubject.next(false);
    this.hasMoreMovesSubject.next(true);
    this.loadedMoves = 0;
  }
}
