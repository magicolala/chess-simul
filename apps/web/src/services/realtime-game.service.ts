import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { GameRow, MoveRow, PresenceUser } from '../models/realtime.model';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class RealtimeGameService implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly logger = inject(LoggerService);

  private channel?: RealtimeChannel;
  private currentGameId?: string;
  private loadedMoves = 0;
  private defaultPageSize = 25;

  game = signal<GameRow | null>(null);
  moves = signal<MoveRow[]>([]);
  onlinePlayers = signal<PresenceUser[]>([]);
  loadingMoves = signal<boolean>(false);
  hasMoreMoves = signal<boolean>(true);

  async subscribe(gameId: string, presence?: PresenceUser) {
    if (!gameId) return;
    // If already subscribed to this game with an active channel, do nothing
    if (this.currentGameId === gameId && this.channel) return;

    this.logger.info(`[RealtimeGameService] 📡 Subscribing to game: ${gameId}`);
    await this.teardown();
    
    // Only clear game if it's not the one we are subscribing to (preloading support)
    if (this.game()?.id !== gameId) {
      this.game.set(null);
    }
    
    this.moves.set([]);
    this.onlinePlayers.set([]);
    this.loadingMoves.set(false);
    this.hasMoreMoves.set(true);
    this.loadedMoves = 0;
    
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
        this.game.set(this.coerceGameRow(payload.new));
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

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.logger.info('[RealtimeGameService] 📡 Subscribed to channel, loading initial data...');
        channel.track(presencePayload);
        
        // Fetch initial game state if not already set or if it's a different game
        if (this.game()?.id !== gameId) {
          const { data, error } = await this.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
          
          if (!error && data) {
            this.game.set(this.coerceGameRow(data));
          } else if (error) {
            console.error('[RealtimeGameService] ❌ Failed to fetch initial game data:', error);
          }
        }

        void this.loadNextMovesPage();
      }
    });

    this.channel = channel;
  }

  async loadNextMovesPage(pageSize = this.defaultPageSize) {
    if (!this.currentGameId || this.loadingMoves() || !this.hasMoreMoves())
      return;

    this.loadingMoves.set(true);
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
        this.hasMoreMoves.set(false);
      }
    } else if (error) {
      console.error('Failed to load moves', error);
      this.hasMoreMoves.set(false);
    }

    this.loadingMoves.set(false);
  }

  preloadGame(game: GameRow | null) {
    this.game.set(game);
  }

  preloadMoves(moves: MoveRow[]) {
    this.mergeMoves(moves);
    this.hasMoreMoves.set(false);
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
      console.error('Submit move error details:', error);
      if (error && typeof error === 'object' && 'context' in error) {
         try {
             const response = (error as { context: Response }).context;
             if (response && response.json) {
                const body = await response.json();
                console.error('Submit move error body:', body);
             }
         } catch (e) {
             console.error('Could not parse error body', e);
         }
      }
      throw new Error(error.message);
    }

    return data;
  }

  async resignGame(gameId: string) {
    const { data, error } = await this.supabase.functions.invoke<{
      success?: boolean;
      error?: string;
    }>('resign-game', {
      body: { game_id: gameId }
    });

    if (error) {
       console.error('Resign game error:', error);
       if (error && typeof error === 'object' && 'context' in error) {
         try {
             const response = error.context as Response;
             if (response && response.json) {
                const body = await response.json();
                console.error('Resign game error body:', body);
             }
         } catch (e) {
             console.error('Could not parse error body', e);
         }
       }
       throw new Error(error.message);
    }

    return data;
  }

  async teardown() {
    const channelToClose = this.channel;
    this.channel = undefined;
    if (channelToClose) {
      this.logger.info('[RealtimeGameService] 🔌 Removing channel...');
      await this.supabase.removeChannel(channelToClose);
    }
    // We clear sub-state but keep currentGameId to prevent unnecessary re-subscribes
    // until a new ID is requested.
    this.moves.set([]);
    this.onlinePlayers.set([]);
  }

  ngOnDestroy(): void {
    void this.teardown();
  }

  private mergeMoves(incoming: MoveRow[]) {
    if (!incoming || incoming.length === 0) return;

    this.moves.update(current => {
      const existingById = new Map<number, MoveRow>();
      for (const move of current) {
        existingById.set(move.id, move);
      }

      for (const move of incoming) {
        if (move?.id) {
          existingById.set(move.id, move);
        }
      }

      const merged = Array.from(existingById.values()).sort((a, b) => (a.ply ?? 0) - (b.ply ?? 0));
      this.loadedMoves = merged.length;
      return merged;
    });
  }

  private refreshPresence(channel: RealtimeChannel) {
    const state = channel.presenceState<PresenceUser>();
    const flattened = Object.values(state).flat();
    this.onlinePlayers.set(flattened);
  }

  private coerceGameRow(row: Partial<GameRow> | null | undefined): GameRow | null {
    if (row && typeof row === 'object' && 'id' in row && typeof row.id === 'string') {
      return row as GameRow;
    }
    return null;
  }

  private resetState() {
    this.game.set(null);
    this.moves.set([]);
    this.onlinePlayers.set([]);
    this.loadingMoves.set(false);
    this.hasMoreMoves.set(true);
    this.loadedMoves = 0;
  }
}
