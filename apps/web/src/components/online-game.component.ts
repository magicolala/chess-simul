import { Component, inject, computed, effect, OnDestroy, output, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from './chess-board.component';
import { RealtimeGameService } from '../services/realtime-game.service';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';
import { SupabaseMatchmakingService } from '../services/supabase-matchmaking.service';

@Component({
  selector: 'app-online-game',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    @if (game(); as g) {
      <div class="h-full flex flex-col md:flex-row max-w-7xl mx-auto md:p-4 gap-4 font-sans relative">
        <!-- Connection Status -->
        @if (onlinePlayers().length < 2 && g.status === 'active') {
          <div class="absolute top-0 left-0 w-full z-30 bg-yellow-500 text-white text-xs font-bold uppercase text-center py-1">
            ⚠️ En attente de l'adversaire...
          </div>
        }

        <!-- LEFT: Board Area -->
        <div class="flex-1 flex flex-col">
          <!-- Top Player (Opponent) -->
          <div class="ui-card p-2 mb-2 flex justify-between items-center bg-white dark:bg-[#1a1a1a]">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-[#1D1C1C] dark:border-white">
                 <span class="text-xl">👤</span>
              </div>
              <div>
                <p class="font-bold text-sm text-[#1D1C1C] dark:text-white leading-none">
                  {{ isMeWhite() ? 'Adversaire (Noirs)' : 'Adversaire (Blancs)' }}
                </p>
                <p class="text-[10px] font-mono text-gray-400 uppercase font-bold">{{ opponentId()?.substring(0, 8) }}</p>
              </div>
            </div>
            <div class="font-mono text-xl font-black px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-[2px]"
                 [class.bg-green-100]="isOpponentTurn()">
              {{ formatTime(opponentTime()) }}
            </div>
          </div>

          <!-- BOARD -->
          <div class="flex-1 bg-[#e0e0e0] dark:bg-gray-950 border-2 border-[#1D1C1C] dark:border-white flex items-center justify-center p-2 relative rounded-[2px]">
            <div class="w-full max-w-[70vh] aspect-square wero-shadow">
              <app-chess-board
                [fen]="g.fen"
                [lastMove]="parseUci(g.last_move_uci)"
                [isInteractive]="g.status === 'active' && isMyTurn()"
                [allowedColor]="myColor()"
                [orientation]="myColor()"
                [allowPremoves]="prefs.gameSettings().allowPremoves"
                (move)="onMove($event)"
              >
              </app-chess-board>
            </div>

            <!-- Game Over Overlay -->
            @if (g.status !== 'active') {
              <div class="absolute inset-0 bg-[#1D1C1C]/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                <h2 class="text-5xl font-black text-white uppercase mb-2 tracking-tighter">
                  {{ g.status === 'draw' ? 'Nulle' : (isWinner() ? 'Victoire !' : 'Défaite') }}
                </h2>
                <p class="text-[#FFF48D] font-black text-xl mb-8 uppercase">{{ g.status }}</p>

                <div class="flex space-x-4">
                  <button (click)="leave()" class="ui-btn ui-btn-primary px-8 py-3 text-lg font-black font-display">
                    Retour au Lobby
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Bottom Player (Me) -->
          <div class="ui-card p-2 mt-2 flex justify-between items-center bg-white dark:bg-[#1a1a1a]">
            <div class="flex items-center space-x-3">
              <img [src]="auth.currentUser()?.avatar" class="w-10 h-10 border-2 border-[#1D1C1C] dark:border-white rounded-full bg-gray-100" />
              <div>
                <p class="font-bold text-sm text-[#1D1C1C] dark:text-white leading-none">
                  {{ auth.currentUser()?.name }} (Moi)
                </p>
                <p class="text-[10px] font-mono text-gray-400 uppercase font-bold">ELO: {{ auth.currentUser()?.elo }}</p>
              </div>
            </div>
            <div class="font-mono text-xl font-black px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-[2px]"
                 [class.bg-green-100]="isMyTurn()">
              {{ formatTime(myTime()) }}
            </div>
          </div>
        </div>

        <!-- RIGHT: Moves & Chat -->
        <div class="ui-card w-full md:w-80 flex flex-col bg-white dark:bg-[#1a1a1a]">
          <div class="p-3 border-b-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#121212]">
            <h3 class="text-xs font-black uppercase text-gray-500">Notation</h3>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2">
            <div class="grid grid-cols-2 gap-1">
              @for (move of moves(); track move.id; let i = $index) {
                <div class="text-xs p-1 border-b border-gray-100 dark:border-gray-800 font-mono">
                  <span class="text-gray-400 mr-2">{{ (i/2 + 1) | number:'1.0-0' }}.</span>
                  <span class="font-bold">{{ move.san }}</span>
                </div>
              }
            </div>
          </div>

          <div class="p-4 bg-gray-100 dark:bg-black space-y-2">
             <button (click)="resign()" class="ui-btn ui-btn-ghost w-full py-2 text-xs text-red-600 font-bold border-red-200" [disabled]="g.status !== 'active'">
               🏳 Abandonner
             </button>
             <button (click)="leave()" class="ui-btn ui-btn-ghost w-full py-2 text-xs text-gray-600 font-bold">
               ← Retour au lobby
             </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="h-full flex items-center justify-center font-display">
        <div class="text-center animate-pulse">
          <p class="text-2xl font-black uppercase mb-2">Chargement de la partie...</p>
          <div class="w-16 h-1 bg-[#1D1C1C] dark:bg-white mx-auto"></div>
        </div>
      </div>
    }
  `
})
export class OnlineGameComponent implements OnDestroy {
  realtime = inject(RealtimeGameService);
  auth = inject(AuthService);
  prefs = inject(PreferencesService);
  matchmaking = inject(SupabaseMatchmakingService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  
  leaveGame = output<void>();

  game = this.realtime.game;
  moves = this.realtime.moves;
  onlinePlayers = this.realtime.onlinePlayers;

  // Subscriptions handled by service
  now = signal(Date.now());
  private timerInterval: ReturnType<typeof setInterval> | undefined;
  private timeoutCheckInterval: ReturnType<typeof setInterval> | undefined;
  private isCheckingTimeout = false;

  constructor() {
    // Listen to URL ID
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.matchmaking.activeGameId.set(id);
      }
    });

    effect(() => {
      const gId = this.matchmaking.activeGameId();
      if (gId) {
        // console.log('[OnlineGame] Subscribing to game:', gId);
        const user = this.auth.currentUser();
        this.realtime.subscribe(gId, user ? {
          user_id: user.id,
          username: user.name
        } : undefined);
      }
    });
    
    // Ticking for timer
    this.timerInterval = setInterval(() => {
      this.now.set(Date.now());
    }, 100);

    // Timeout check every 500ms
    this.timeoutCheckInterval = setInterval(() => {
      void this.checkForTimeout();
    }, 500);
  }

  ngOnDestroy() {
    this.realtime.teardown();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.timeoutCheckInterval) clearInterval(this.timeoutCheckInterval);
  }

  isMeWhite = computed(() => this.game()?.white_id === this.auth.currentUser()?.id);
  myColor = computed(() => this.isMeWhite() ? 'w' : 'b');
  isMyTurn = computed(() => {
    const g = this.game();
    if (!g) return false;
    return g.turn === this.myColor();
  });
  isOpponentTurn = computed(() => this.game()?.status === 'active' && !this.isMyTurn());

  opponentId = computed(() => this.isMeWhite() ? this.game()?.black_id : this.game()?.white_id);

  // Clocks
  myTime = computed(() => {
    const g = this.game();
    const clocks = g?.clocks as { white: number; black: number } | undefined;
    if (!clocks) return 0;
    
    const baseTime = this.isMeWhite() ? clocks.white : clocks.black;
    if (this.isMyTurn() && g?.status === 'active' && g.updated_at) {
        // If my turn, subtract elapsed time
        const elapsed = this.now() - new Date(g.updated_at).getTime();
        return Math.max(0, baseTime - elapsed);
    }
    return baseTime;
  });

  opponentTime = computed(() => {
    const g = this.game();
    const clocks = g?.clocks as { white: number; black: number } | undefined;
    if (!clocks) return 0;
    
    const baseTime = this.isMeWhite() ? clocks.black : clocks.white;
    if (this.isOpponentTurn() && g?.status === 'active' && g.updated_at) {
         const elapsed = this.now() - new Date(g.updated_at).getTime();
         return Math.max(0, baseTime - elapsed);
    }
    return baseTime;
  });

  isWinner = computed(() => {
    const g = this.game();
    if (!g || g.status === 'active' || g.status === 'draw') return false;
    
    // Check if winner_id is set (explicit win/resign)
    if (g.winner_id) {
        return g.winner_id === this.auth.currentUser()?.id;
    }

    if (g.status === 'checkmate') {
      return g.turn !== this.myColor();
    }
    return false;
  });

  async onMove(move: { from: string; to: string; promotion?: string }) {
    const gId = this.game()?.id;
    if (!gId) return;

    const uci = `${move.from}${move.to}${move.promotion || ''}`;
    try {
      await this.realtime.submitMove(gId, uci);
    } catch (e: unknown) {
      console.error('[OnlineGame] Move failed:', (e as Error).message);
    }
  }

  async resign() {
    if (!confirm('Abandonner la partie ?')) return;
    const gId = this.game()?.id;
    if (!gId) return;

    try {
      await this.realtime.resignGame(gId);
    } catch (e: unknown) {
      alert('Erreur lors de l\'abandon : ' + (e as Error).message);
    }
  }

  leave() {
    this.matchmaking.activeGameId.set(null);
    this.leaveGame.emit();
    this.router.navigate(['/dashboard']);
  }

  private async checkForTimeout() {
    // Avoid concurrent checks
    if (this.isCheckingTimeout) return;

    const g = this.game();
    if (!g || g.status !== 'active') return;

    // Only check if it's my turn
    if (!this.isMyTurn()) return;

    const myTime = this.myTime();
    // Only call server when time is actually expired
    if (myTime <= 0) {
      this.isCheckingTimeout = true;
      try {
        const result = await this.realtime.checkTimeout(g.id);
        if (result?.timeout) {
          console.warn('[OnlineGame] ⏰ Timeout detected by heartbeat');
        }
      } catch (e: unknown) {
        console.error('[OnlineGame] Timeout check failed:', (e as Error).message);
      } finally {
        this.isCheckingTimeout = false;
      }
    }
  }

  formatTime(ms: number | undefined): string {
    if (ms === undefined || ms === null) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  parseUci(uci: string | null | undefined) {
    if (!uci || uci.length < 4) return null;
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4)
    };
  }
}
