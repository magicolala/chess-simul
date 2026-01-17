import { Injectable, signal, effect, computed, inject } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

export interface GameResult {
  id: string;
  opponentName: string;
  opponentRating: number;
  opponentAvatar: string;
  result: 'win' | 'loss' | 'draw'; // from player perspective
  date: number;
  fen: string;
  hydraPoints: number;
  eloDelta?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  history = signal<GameResult[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private supabase = inject(SupabaseClientService);
  private realtimeChannel?: RealtimeChannel;

  stats = computed(() => {
    const games = this.history();
    const total = games.length;
    if (total === 0) {
      return { wins: 0, losses: 0, draws: 0, winRate: 0 };
    }

    const wins = games.filter((g) => g.result === 'win').length;
    const losses = games.filter((g) => g.result === 'loss').length;
    const draws = games.filter((g) => g.result === 'draw').length;

    return {
      wins,
      losses,
      draws,
      winRate: Math.round((wins / total) * 100)
    };
  });

  hydraStats = computed(() => {
    const games = this.history();
    const wins = games.filter((g) => g.result === 'win').length;
    const draws = games.filter((g) => g.result === 'draw').length;
    const losses = games.filter((g) => g.result === 'loss').length;
    const totalPoints = games.reduce((sum, g) => sum + (g.hydraPoints ?? 0), 0);

    return {
      totalPoints,
      wins,
      draws,
      losses
    };
  });

  constructor() {
    const stored = localStorage.getItem('simul_history');
    if (stored) {
      const parsed: GameResult[] = JSON.parse(stored);
      this.history.set(
        parsed.map((result) => ({
          hydraPoints: 0,
          ...result
        }))
      );
    }

    effect(() => {
      localStorage.setItem('simul_history', JSON.stringify(this.history()));
    });
  }

  addResult(result: GameResult) {
    this.history.update((h) => [result, ...h]);
  }

  clearHistory() {
    this.history.set([]);
  }

  getStats() {
    return this.stats();
  }

  getHydraStats() {
    return this.hydraStats();
  }

  async fetchHistoryFromSupabase() {
    const user = this.supabase.currentUser();
    if (!user) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('games')
      .select('id, white_id, black_id, status, turn, fen, updated_at, created_at')
      .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
      .in('status', ['checkmate', 'draw', 'resigned', 'aborted']);

    if (error) {
      this.error.set(error.message ?? "Impossible de récupérer l'historique.");
      this.loading.set(false);
      return;
    }

    const opponentIds = new Set<string>();
    for (const game of data ?? []) {
      const isWhite = game.white_id === user.id;
      const opponentId = isWhite ? game.black_id : game.white_id;
      if (opponentId) {
        opponentIds.add(opponentId);
      }
    }

    let profileMap = new Map<string, { id: string; username: string; avatar_url: string | null }>();
    if (opponentIds.size > 0) {
      const { data: profiles } = await this.supabase.client
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(opponentIds));

      profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    }

    const mapped: GameResult[] = (data ?? []).map((game) => {
      const playerColor = game.white_id === user.id ? 'w' : 'b';
      const opponentId = playerColor === 'w' ? game.black_id : game.white_id;
      const opponentProfile = opponentId ? profileMap.get(opponentId) : null;

      return {
        id: game.id,
        opponentName: opponentProfile?.username ?? 'Adversaire',
        opponentRating: 0,
        opponentAvatar: opponentProfile?.avatar_url ?? 'https://placehold.co/48x48',
        result: this.deriveResult(game.status, game.turn, playerColor),
        date: new Date(game.updated_at ?? game.created_at ?? Date.now()).getTime(),
        fen: game.fen,
        hydraPoints: 0,
        eloDelta: 0
      };
    });

    this.history.set(mapped.sort((a, b) => b.date - a.date));
    this.loading.set(false);
    this.ensureRealtimeSubscription(user.id);
  }

  async teardownRealtime() {
    if (!this.realtimeChannel) {
      return;
    }
    await this.supabase.client.removeChannel(this.realtimeChannel);
    this.realtimeChannel = undefined;
  }

  private ensureRealtimeSubscription(userId: string) {
    if (this.realtimeChannel) {
      return;
    }

    this.realtimeChannel = this.supabase.client
      .channel(`game-history:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `white_id=eq.${userId}` },
        (payload) => {
          this.handleRealtimeGame(payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `black_id=eq.${userId}` },
        (payload) => {
          this.handleRealtimeGame(payload.new as any);
        }
      )
      .subscribe();
  }

  private handleRealtimeGame(game: any) {
    if (!game?.status) {
      return;
    }
    if (['checkmate', 'draw', 'resigned', 'aborted'].includes(game.status)) {
      void this.fetchHistoryFromSupabase();
    }
  }

  private deriveResult(
    status: string,
    turn: 'w' | 'b' | null,
    playerColor: 'w' | 'b'
  ): 'win' | 'loss' | 'draw' {
    if (status === 'draw' || status === 'aborted') {
      return 'draw';
    }

    if (status === 'checkmate' && turn) {
      const winner = turn === 'w' ? 'b' : 'w';
      return winner === playerColor ? 'win' : 'loss';
    }

    if (status === 'resigned' && turn) {
      return turn === playerColor ? 'loss' : 'win';
    }

    return 'draw';
  }
}
