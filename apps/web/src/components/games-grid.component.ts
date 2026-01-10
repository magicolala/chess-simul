import { Component, inject, computed, output, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseMatchmakingService } from '../services/supabase-matchmaking.service';
import { RealtimeGameService } from '../services/realtime-game.service';
import { AuthService } from '../services/auth.service';
import { ChessBoardComponent } from './chess-board.component';
import type { GameRow } from '../models/realtime.model';
import type { Profile } from '../models/profile.model';

interface GridGame extends Omit<GameRow, 'clocks'> {
  white_profile?: Profile;
  black_profile?: Profile;
  clocks?: { white: number; black: number };
}

@Component({
  selector: 'app-games-grid',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <div class="w-full flex flex-col pb-12">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 px-2">
        <h2 class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tight">
          Mes Parties
          @if (totalGamesCount() > 0) {
            <span class="text-sm bg-[#7AF7F7] text-[#1D1C1C] px-2 py-0.5 ml-2">{{ totalGamesCount() }}</span>
          }
        </h2>

        
        <!-- Filters -->
        <div class="flex items-center space-x-1 bg-[#1D1C1C]/5 p-1 rounded-lg">
          <button 
            (click)="filterMode.set('all')"
            class="px-3 py-1 text-xs font-bold rounded-md transition-all"
            [class.bg-[#1D1C1C]]="filterMode() === 'all'"
            [class.text-white]="filterMode() === 'all'"
            [class.text-gray-500]="filterMode() !== 'all'"
            [class.hover:bg-gray-200]="filterMode() !== 'all'"
          >
            Toutes
          </button>
          <button 
            (click)="filterMode.set('my-turn')"
            class="px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center space-x-1"
            [class.bg-[#7AF7F7]]="filterMode() === 'my-turn'"
            [class.text-[#1D1C1C]]="filterMode() === 'my-turn'"
            [class.text-gray-500]="filterMode() !== 'my-turn'"
            [class.hover:bg-gray-200]="filterMode() !== 'my-turn'"
          >
            <span>À vous</span>
            @if (myTurnCount() > 0) {
              <span class="bg-[#1D1C1C] text-white text-[10px] px-1.5 rounded-full">{{ myTurnCount() }}</span>
            }
          </button>
          <button 
            (click)="filterMode.set('active')"
            class="px-3 py-1 text-xs font-bold rounded-md transition-all"
            [class.bg-[#1D1C1C]]="filterMode() === 'active'"
            [class.text-white]="filterMode() === 'active'"
            [class.text-gray-500]="filterMode() !== 'active'"
            [class.hover:bg-gray-200]="filterMode() !== 'active'"
          >
            En attente
          </button>
        </div>
      </div>

      <!-- Grid Container -->
      @if (activeGames().length === 0) {
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-[2px]">
            <div class="text-6xl mb-4 opacity-50">🎮</div>
            <h3 class="text-xl font-black font-display text-gray-400 uppercase mb-2">
              @if (filterMode() === 'all') { Aucune partie en cours }
              @else { Aucune partie trouvée }
            </h3>
            <p class="text-sm text-gray-400">
              @if (filterMode() === 'all') { Lancez une partie depuis le lobby multijoueur }
              @else { Modifiez vos filtres pour voir les autres parties }
            </p>
          </div>
        </div>
      } @else {
        <div 
          class="flex-1 grid gap-4 p-2 w-full transition-all duration-300"
          [class.grid-cols-1]="activeGames().length === 1"
          [class.grid-cols-2]="activeGames().length >= 2 && activeGames().length <= 4"
          [class.grid-cols-3]="activeGames().length >= 5"
          [class.max-w-2xl]="activeGames().length === 1"
          [class.mx-auto]="activeGames().length === 1"
          [class.place-self-center]="activeGames().length === 1"
        >
          @for (game of activeGames(); track game.id) {
            <div 
              class="relative bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white overflow-hidden transition-all hover:shadow-lg group flex flex-col"
              [class.ring-4]="isMyTurn(game)"
              [class.ring-[#7AF7F7]]="isMyTurn(game)"
              [class.animate-pulse-subtle]="isMyTurn(game)"
            >
              <!-- Urgent Turn Indicator -->
              @if (isMyTurn(game)) {
                <div class="absolute top-0 left-0 right-0 z-10 bg-[#7AF7F7] text-[#1D1C1C] text-center py-1 text-xs font-black uppercase tracking-wider">
                  ⚡ À VOUS DE JOUER
                </div>
              }

              <!-- Mini Board -->
              <div 
                class="w-full aspect-square pointer-events-auto"
                [class.pt-6]="isMyTurn(game)"
              >
                <app-chess-board
                  class="block w-full h-full"
                  [fen]="game.fen"
                  [lastMove]="null"
                  [orientation]="game.white_id === auth.currentUser()?.id ? 'w' : 'b'"
                  [isInteractive]="true"
                  (move)="onMove(game.id, $event)"
                ></app-chess-board>
              </div>

              <!-- Action Footer -->
              <div class="relative bg-[#1D1C1C]/90 p-2 flex items-center justify-between pointer-events-auto mt-auto">
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 rounded-full bg-gray-300 border border-white overflow-hidden">
                      <img [src]="getOpponentAvatar(game)" class="w-full h-full object-cover" 
                           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👤</text></svg>'" />
                    </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  <div 
                    class="text-xs font-mono font-black px-2 py-0.5 rounded"
                    [class.bg-[#7AF7F7]]="isMyTurn(game)"
                    [class.text-[#1D1C1C]]="isMyTurn(game)"
                    [class.bg-gray-600]="!isMyTurn(game)"
                    [class.text-white]="!isMyTurn(game)"
                  >
                    {{ formatTime(getMyTime(game)) }}
                  </div>
                  
                  <button 
                    (click)="openGame.emit(game.id)"
                    class="bg-white text-[#1D1C1C] hover:bg-[#7AF7F7] p-1 rounded transition-colors"
                    title="Ouvrir en plein écran"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Hover Overlay -->

            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes pulse-subtle {
      0%, 100% { box-shadow: 0 0 0 0 rgba(122, 247, 247, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(122, 247, 247, 0); }
    }
    .animate-pulse-subtle {
      animation: pulse-subtle 2s ease-in-out infinite;
    }
  `]
})
export class GamesGridComponent implements OnDestroy {
  matchmaking = inject(SupabaseMatchmakingService);
  realtime = inject(RealtimeGameService);
  auth = inject(AuthService);

  openGame = output<string>();

  // Timer for clock updates
  now = signal(Date.now());
  filterMode = signal<'all' | 'my-turn' | 'active'>('all');
  private timerInterval: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.timerInterval = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  activeGames = computed(() => {
    let games = [...(this.matchmaking.activeGames() as GridGame[])];

    // Priority Sort: My Turn > Lowest Time
    games.sort((a, b) => {
      const myTurnA = this.isMyTurn(a);
      const myTurnB = this.isMyTurn(b);

      if (myTurnA !== myTurnB) {
        return myTurnA ? -1 : 1;
      }

      // If same turn status, sort by lowest time
      return this.getMyTime(a) - this.getMyTime(b);
    });

    const filter = this.filterMode();

    if (filter === 'all') return games;
    if (filter === 'my-turn') return games.filter(g => this.isMyTurn(g));
    if (filter === 'active') return games.filter(g => !this.isMyTurn(g));
    
    return games;
  });

  totalGamesCount = computed(() => this.matchmaking.activeGames().length);

  myTurnCount = computed(() => 
    (this.matchmaking.activeGames() as GridGame[]).filter(g => this.isMyTurn(g)).length
  );

  isMyTurn(game: GridGame): boolean {
    const myId = this.auth.currentUser()?.id;
    const myColor = game.white_id === myId ? 'w' : 'b';
    return game.turn === myColor;
  }

  getOpponentName(game: GridGame): string {
    const myId = this.auth.currentUser()?.id;
    const isWhite = game.white_id === myId;
    const profile = isWhite ? game.black_profile : game.white_profile;
    return profile?.username || 'Adversaire';
  }

  getOpponentAvatar(game: GridGame): string {
    const myId = this.auth.currentUser()?.id;
    const isWhite = game.white_id === myId;
    const profile = isWhite ? game.black_profile : game.white_profile;
    return profile?.avatar_url || '';
  }

  getMyTime(game: GridGame): number {
    const myId = this.auth.currentUser()?.id;
    const clocks = game.clocks;
    if (!clocks) return 0;

    const baseTime = game.white_id === myId ? clocks.white : clocks.black;
    
    // If it's my turn, subtract elapsed time
    if (this.isMyTurn(game) && game.updated_at) {
      const elapsed = this.now() - new Date(game.updated_at).getTime();
      return Math.max(0, baseTime - elapsed);
    }
    return baseTime;
  }

  formatTime(ms: number | undefined): string {
    if (ms === undefined) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async onMove(gameId: string, move: { from: string; to: string; promotion?: string }) {
    const uci = `${move.from}${move.to}${move.promotion || ''}`;
    try {
      await this.realtime.submitMove(gameId, uci);
    } catch (e: unknown) {
      console.error('[GamesGrid] Move failed:', (e as Error).message);
    }
  }
}
