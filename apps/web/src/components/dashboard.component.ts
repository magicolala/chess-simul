import { Component, inject, output, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SupabaseMatchmakingService } from '../services/supabase-matchmaking.service';
import { SupabaseSimulService } from '../services/supabase-simul.service';
import { HistoryService } from '../services/history.service';
import { AuthService } from '../services/auth.service';
import { SupabaseSocialService } from '../services/supabase-social.service';
import { ChessBoardComponent } from './chess-board.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, DatePipe],
  template: `
    <div
      class="max-w-7xl mx-auto space-y-8 p-4 md:p-0 font-sans animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <!-- Welcome & Quick Play Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Hero / Quick Play -->
        <div class="lg:col-span-2 space-y-6">
          <div class="ui-card p-6 relative overflow-hidden group">
            <div
              class="absolute top-0 right-0 p-4 opacity-10 font-display text-9xl select-none group-hover:rotate-12 transition-transform duration-700"
            >
              ♟
            </div>

            <h2
              class="text-3xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tight mb-2"
            >
              Prêt à jouer,
              <span
                class="text-[#1D1C1C] dark:text-white underline decoration-[#FFF48D] decoration-4 underline-offset-4"
                >{{ auth.currentUser()?.name }}</span
              >
              ?
            </h2>
            <p class="text-gray-500 dark:text-gray-400 font-medium mb-6 max-w-md">
              Choisissez votre cadence préférée et lancez une partie instantanée.
            </p>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                (click)="triggerQuickGame(1, 0)"
                class="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 border-2 border-[#1D1C1C] dark:border-white hover:bg-[#1D1C1C] hover:text-[#FFF48D] dark:hover:bg-white dark:hover:text-black transition-all group/btn"
              >
                <span class="text-2xl mb-1 group-hover/btn:scale-110 transition-transform">🔥</span>
                <span class="font-black font-display uppercase text-sm">Bullet</span>
                <span class="text-[10px] font-mono font-bold opacity-70">1+0</span>
              </button>
              <button
                (click)="triggerQuickGame(3, 2)"
                class="flex flex-col items-center justify-center p-4 bg-[#FFF48D]/30 border-2 border-[#1D1C1C] dark:border-white hover:bg-[#1D1C1C] hover:text-[#FFF48D] dark:hover:bg-white dark:hover:text-black transition-all group/btn"
              >
                <span class="text-2xl mb-1 group-hover/btn:scale-110 transition-transform">⚡</span>
                <span class="font-black font-display uppercase text-sm">Blitz</span>
                <span class="text-[10px] font-mono font-bold opacity-70">3+2</span>
              </button>
              <button
                (click)="triggerQuickGame(10, 0)"
                class="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 border-2 border-[#1D1C1C] dark:border-white hover:bg-[#1D1C1C] hover:text-[#FFF48D] dark:hover:bg-white dark:hover:text-black transition-all group/btn"
              >
                <span class="text-2xl mb-1 group-hover/btn:scale-110 transition-transform">🐢</span>
                <span class="font-black font-display uppercase text-sm">Rapid</span>
                <span class="text-[10px] font-mono font-bold opacity-70">10+0</span>
              </button>
              <button
                (click)="triggerQuickGame(30, 0)"
                class="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-[#1D1C1C] dark:border-white hover:bg-[#1D1C1C] hover:text-[#FFF48D] dark:hover:bg-white dark:hover:text-black transition-all group/btn"
              >
                <span class="text-2xl mb-1 group-hover/btn:scale-110 transition-transform">☕</span>
                <span class="font-black font-display uppercase text-sm">Classic</span>
                <span class="text-[10px] font-mono font-bold opacity-70">30+0</span>
              </button>
            </div>
          </div>

          <!-- Active Games (Continue) -->
          @if (activeGames().length > 0) {
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3
                  class="text-lg font-black font-display text-[#1D1C1C] dark:text-white uppercase bg-[#7AF7F7] inline-block px-2 border-2 border-transparent text-black"
                >
                  En cours ({{ activeGames().length }})
                </h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (game of activeGames(); track game.id) {
                  <div
                    class="ui-card p-3 flex items-center space-x-4 cursor-pointer hover:border-[#1D1C1C] dark:hover:border-white transition-all relative overflow-hidden group/game"
                    [class.ring-2]="isMyTurn(game)"
                    [class.ring-[#7AF7F7]]="isMyTurn(game)"
                    (click)="resumeGame.emit(game.id)"
                  >
                    <!-- Turn indicator ribbon -->
                    @if (isMyTurn(game)) {
                      <div class="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                        <div class="absolute top-0 right-0 bg-[#7AF7F7] text-[#1D1C1C] text-[8px] font-black uppercase py-0.5 w-32 text-center rotate-45 translate-x-10 translate-y-3 shadow-sm">
                          À VOUS
                        </div>
                      </div>
                    }

                    <div class="w-20 h-20 md:w-24 md:h-24 pointer-events-none border border-gray-200 dark:border-gray-800 rounded-sm overflow-hidden flex-shrink-0">
                      <app-chess-board
                        [fen]="game.fen"
                        [lastMove]="null"
                        [orientation]="game.white_id === auth.currentUser()?.id ? 'w' : 'b'"
                      ></app-chess-board>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start mb-1">
                        <div class="flex flex-col truncate">
                           <div class="flex items-center space-x-2">
                              <img [src]="getOpponentAvatar(game)" class="w-4 h-4 rounded-full border border-gray-100" />
                              <h4 class="font-bold font-display text-xs truncate">
                                {{ getOpponentName(game) }}
                              </h4>
                           </div>
                           @if (game.game_mode === 'simul') {
                             <span class="text-[8px] bg-[#FFF48D] text-[#1D1C1C] px-1 font-black w-fit uppercase mt-0.5">Simultanée</span>
                           }
                        </div>
                        <span
                          class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded"
                          [class.bg-green-100]="isMyTurn(game)"
                          [class.text-green-700]="isMyTurn(game)"
                          [class.bg-gray-100]="!isMyTurn(game)"
                          [class.dark:bg-gray-800]="!isMyTurn(game)"
                        >
                          {{ formatTime(getMyTime(game)) }}
                        </span>
                      </div>
                      <p class="text-[10px] text-gray-500 font-mono flex items-center">
                        <span class="w-2 h-2 rounded-full mr-2" [class.bg-[#7AF7F7]]="isMyTurn(game)" [class.bg-gray-300]="!isMyTurn(game)"></span>
                        {{ isMyTurn(game) ? 'C’est à votre tour !' : 'En attente de l’adversaire' }}
                      </p>
                      
                      <div class="mt-3 flex space-x-2">
                        <button
                          class="flex-1 text-[10px] font-black uppercase bg-[#1D1C1C] text-white dark:bg-white dark:text-[#1D1C1C] py-1.5 hover:bg-[#7AF7F7] hover:text-[#1D1C1C] transition-colors"
                        >
                          Reprendre
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Right: ELO & Stats -->
        <div class="space-y-6">
          <!-- ELO Widget -->
          <div class="ui-card p-6 flex flex-col justify-between h-64 relative overflow-hidden">
            <div class="z-10">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Classement Blitz
              </h3>
              <div class="flex items-end space-x-3">
                <span class="text-5xl font-black font-display text-[#1D1C1C] dark:text-white"
                  >1245</span
                >
                <span
                  class="text-sm font-bold text-green-600 bg-green-50 px-1 border border-green-200 mb-2"
                  >▲ 24</span
                >
              </div>
            </div>

            <!-- Simple SVG Graph Mockup -->
            <svg
              class="absolute bottom-0 left-0 w-full h-32 text-[#FFF48D] opacity-50 dark:opacity-20"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              <path
                d="M0,40 L0,30 L10,35 L20,25 L30,28 L40,15 L50,20 L60,10 L70,12 L80,5 L90,8 L100,0 L100,40 Z"
                fill="currentColor"
              />
              <path
                d="M0,30 L10,35 L20,25 L30,28 L40,15 L50,20 L60,10 L70,12 L80,5 L90,8 L100,0"
                fill="none"
                stroke="#1D1C1C"
                stroke-width="0.5"
                class="dark:stroke-white"
              />
            </svg>

            <div
              class="z-10 mt-auto pt-4 border-t-2 border-gray-100 dark:border-gray-800 flex justify-between text-xs font-bold text-gray-500"
            >
              <span>Progression</span>
              <span>+12% ce mois</span>
            </div>
          </div>

          <!-- Friends Online (Powered by SocialService) -->
          <div class="ui-card p-4">
            <h3
              class="text-xs font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-widest mb-4 flex justify-between items-center"
            >
              Amis en ligne
              <span class="bg-green-500 text-white text-[10px] px-1.5 rounded-full">{{
                onlineFriends().length
              }}</span>
            </h3>
            <div class="space-y-3">
              @for (friend of onlineFriends(); track friend.id) {
                <div
                  class="flex items-center space-x-3 group cursor-pointer"
                  (click)="goToSocial.emit()"
                >
                  <div class="relative">
                    <img
                      [src]="friend.avatar"
                      class="w-8 h-8 border border-[#1D1C1C] dark:border-white bg-gray-100 rounded-full"
                    />
                    <div
                      class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-white rounded-full"
                    ></div>
                  </div>
                  <div class="flex-1">
                    <p
                      class="text-xs font-bold text-[#1D1C1C] dark:text-white group-hover:underline"
                    >
                      {{ friend.name }}
                    </p>
                    <p class="text-[10px] text-gray-400">
                      {{ friend.status === 'ingame' ? 'En partie' : 'Disponible' }}
                    </p>
                  </div>
                  <button
                    class="text-[10px] border border-[#1D1C1C] dark:border-white px-2 py-0.5 hover:bg-[#1D1C1C] hover:text-white dark:hover:bg-white dark:hover:text-black uppercase font-bold transition-colors"
                  >
                    ⚔️
                  </button>
                </div>
              }
              @if (onlineFriends().length === 0) {
                <p class="text-xs text-gray-400 italic">Aucun ami en ligne.</p>
              }
            </div>
            <button
              (click)="goToSocial.emit()"
              class="w-full mt-4 text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 py-2 hover:bg-[#1D1C1C] hover:text-white transition-colors"
            >
              Voir tout le monde
            </button>
          </div>
        </div>
      </div>

      <!-- Cards Row: Simul, Tournaments, History -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Simultanées Card -->
        <div
          (click)="enterSimul()"
          class="bg-[#FFF48D] border-2 border-[#1D1C1C] wero-shadow p-6 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden group"
        >
          <div
            class="absolute -right-4 -bottom-4 text-8xl opacity-20 font-display group-hover:scale-110 transition-transform"
          >
            ⚔️
          </div>
          <h3 class="text-xl font-black font-display text-[#1D1C1C] uppercase mb-1">Simultanées</h3>
          <p class="text-sm font-bold text-[#1D1C1C]/80 mb-4">
            {{ hostedSimul() ? 'Votre simultanée est en cours.' : 'Défiez jusqu\'à 20 joueurs en même temps.' }}
          </p>
          <span
            class="inline-block bg-[#1D1C1C] text-white text-xs font-black px-3 py-1 uppercase group-hover:bg-white group-hover:text-[#1D1C1C] transition-colors border-2 border-transparent group-hover:border-[#1D1C1C]"
          >
            {{ hostedSimul() ? 'Continuer' : 'Voir tout / Créer' }}
          </span>
        </div>

        <!-- Tournaments Card (Placeholder) -->
        <div class="ui-card p-6 cursor-not-allowed opacity-75 relative">
          <div
            class="absolute top-2 right-2 bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-0.5 uppercase"
          >
            Bientôt
          </div>
          <h3 class="text-xl font-black font-display text-[#1D1C1C] dark:text-white uppercase mb-1">
            Tournois
          </h3>
          <p class="text-sm font-medium text-gray-500 mb-4">Arènes rapides et tournois suisses.</p>
          <div class="flex -space-x-2 opacity-50 grayscale">
            <div class="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
            <div class="w-8 h-8 rounded-full bg-gray-400 border-2 border-white"></div>
            <div class="w-8 h-8 rounded-full bg-gray-500 border-2 border-white"></div>
          </div>
        </div>

        <!-- Recent History (Mini) -->
        <div class="ui-card p-4 flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm font-black font-display text-[#1D1C1C] dark:text-white uppercase">
              Historique Récent
            </h3>
            <button (click)="goToHistory.emit()" class="text-[10px] font-bold underline">
              TOUT VOIR
            </button>
          </div>

          <div class="flex-1 space-y-2 overflow-hidden">
            @for (game of recentHistory(); track game.id) {
              <div
                class="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div class="flex items-center space-x-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    [class.bg-green-500]="game.result === 'win'"
                    [class.bg-red-500]="game.result === 'loss'"
                    [class.bg-gray-400]="game.result === 'draw'"
                  ></span>
                  <span class="font-bold truncate max-w-[80px]">{{ game.opponentName }}</span>
                </div>
                <span class="font-mono text-gray-400">{{ game.date | date: 'dd/MM' }}</span>
              </div>
            }
            @if (recentHistory().length === 0) {
              <div class="text-center text-gray-400 text-xs py-4 italic">
                Aucune partie récente.
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  auth = inject(AuthService);
  socialService = inject(SupabaseSocialService);
  matchmaking = inject(SupabaseMatchmakingService);
  simulService = inject(SupabaseSimulService);
  historyService = inject(HistoryService);

  startQuickGame = output<{ time: number; inc: number }>();
  resumeGame = output<string>();
  goToSimul = output<string | undefined>();
  goToHistory = output<void>();
  goToSocial = output<void>();

  // Computed
  activeGames = computed(() => this.matchmaking.activeGames());

  hostedSimul = computed(() => {
    const list = this.simulService.simulList();
    const myId = this.auth.currentUser()?.id;
    return list.find(s => s.host_id === myId && (s.status === 'open' || s.status === 'running'));
  });

  recentHistory = computed(() => this.historyService.history().slice(0, 5));

  onlineFriends = computed(() =>
    this.socialService
      .friends()
      .filter((f) => f.status !== 'offline')
      .slice(0, 3)
  );

  triggerQuickGame(time: number, inc: number) {
    this.startQuickGame.emit({ time, inc });
  }

  enterSimul() {
    this.goToSimul.emit(this.hostedSimul()?.id);
  }

  formatTime(ms: number | undefined): string {
    if (ms === undefined) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getOpponentName(game: any): string {
    const myId = this.auth.currentUser()?.id;
    const isWhite = game.white_id === myId;
    const profile = isWhite ? game.black_profile : game.white_profile;
    return profile?.username || `Adversaire (${(isWhite ? game.black_id : game.white_id)?.substring(0, 8)})`;
  }

  getOpponentAvatar(game: any): string {
    const myId = this.auth.currentUser()?.id;
    const isWhite = game.white_id === myId;
    const profile = isWhite ? game.black_profile : game.white_profile;
    return profile?.avatar_url || 'https://placehold.co/48x48?text=👤';
  }

  isMyTurn(game: any): boolean {
    const myId = this.auth.currentUser()?.id;
    const myColor = game.white_id === myId ? 'w' : 'b';
    return game.turn === myColor;
  }

  getMyTime(game: any): number {
    const myId = this.auth.currentUser()?.id;
    const clocks = game.clocks as any;
    if (!clocks) return 0;
    return game.white_id === myId ? clocks.white : clocks.black;
  }
}
