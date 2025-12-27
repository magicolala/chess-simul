
import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessSimulService, GameState } from '../services/chess-logic.service';
import { ChessBoardComponent } from './chess-board.component';

@Component({
  selector: 'app-simul-host',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    <div class="h-full flex flex-col md:flex-row overflow-hidden font-sans bg-gray-100 dark:bg-[#0a0a0a]">
        
        <!-- Sidebar: Command Queue -->
        <aside class="w-full md:w-72 bg-white dark:bg-[#1a1a1a] border-r-2 border-[#1D1C1C] dark:border-white flex flex-col z-20 shadow-lg">
            <div class="p-4 border-b-2 border-[#1D1C1C] dark:border-white bg-[#1D1C1C] text-white">
                <h2 class="font-black font-display text-lg uppercase">Command Center</h2>
                <div class="flex justify-between items-center mt-2 text-xs font-bold text-gray-300">
                    <span>{{ activeCount() }} parties</span>
                    <span>1-9 pour accès rapide</span>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-0 space-y-0">
                 <!-- PRIORITY QUEUE -->
                 @if (actionRequiredCount() > 0) {
                     <div class="bg-red-50 dark:bg-red-900/20 px-4 py-2 text-[10px] font-black uppercase text-red-600 tracking-wider border-b border-red-100">
                         File Prioritaire ({{ actionRequiredCount() }})
                     </div>
                     @for (game of actionRequiredGames(); track game.id; let i = $index) {
                         <div (click)="focusGame(game.id)" class="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] cursor-pointer hover:bg-[#FFF48D] dark:hover:bg-gray-800 transition-colors group relative"
                              [class.bg-[#FFF48D]]="focusedGameId() === game.id">
                             
                             <!-- Keyboard Shortcut Badge -->
                             @if (i < 9) {
                                 <div class="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#1D1C1C] text-white flex items-center justify-center text-[10px] font-bold rounded shadow-sm opacity-50 group-hover:opacity-100">
                                     {{ i + 1 }}
                                 </div>
                             }

                             <div class="pl-8">
                                 <div class="flex justify-between items-center mb-1">
                                     <span class="font-black font-display text-sm text-[#1D1C1C] dark:text-white truncate w-24">{{ game.opponentName }}</span>
                                     <span class="text-[10px] font-mono font-bold bg-red-500 text-white px-1.5 py-0.5 rounded shadow-sm">À TOI</span>
                                 </div>
                                 <div class="flex justify-between items-center text-xs">
                                     <span class="text-gray-500">Board #{{ game.id + 1 }}</span>
                                     <span class="font-mono font-bold text-[#1D1C1C] dark:text-gray-300">{{ formatTime(game.whiteTime) }}</span>
                                 </div>
                             </div>
                             
                             <!-- Selection Indicator -->
                             @if (focusedGameId() === game.id) {
                                 <div class="absolute right-0 top-0 bottom-0 w-1 bg-[#1D1C1C]"></div>
                             }
                         </div>
                     }
                 }

                 <!-- WAITING QUEUE -->
                 <div class="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-[10px] font-black uppercase text-gray-500 tracking-wider border-b border-gray-200 border-t border-gray-200">
                     En attente ({{ waitingCount() }})
                 </div>
                 @for (game of waitingGames(); track game.id) {
                     <div (click)="focusGame(game.id)" class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#121212] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 opacity-75">
                         <div class="flex justify-between items-center">
                             <span class="font-bold text-xs text-gray-600 dark:text-gray-400">#{{ game.id + 1 }} {{ game.opponentName }}</span>
                             <span class="text-[10px] text-gray-400 font-mono">{{ formatTime(game.whiteTime) }}</span>
                         </div>
                     </div>
                 }
            </div>
        </aside>

        <!-- Main Area -->
        <main class="flex-1 flex flex-col relative overflow-hidden bg-gray-200 dark:bg-[#000]">
            
            <!-- Grid View (Zoomed Out) -->
            @if (!isFocusedMode()) {
                <div class="flex-1 overflow-y-auto p-4 md:p-8 bg-nano-banana">
                    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        @for (game of games(); track game.id) {
                            <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white p-2 wero-shadow hover:scale-[1.02] transition-transform relative flex flex-col group"
                                [class.ring-4]="game.isHostTurn"
                                [class.ring-red-500]="game.isHostTurn"
                                (click)="focusGame(game.id)">
                                
                                <!-- Header -->
                                <div class="mb-2 flex justify-between items-center z-10 px-1">
                                    <span class="font-black font-display text-sm">#{{ game.id + 1 }}</span>
                                    <div class="flex items-center space-x-1">
                                        <span class="text-[10px] font-bold truncate max-w-[80px]">{{ game.opponentName }}</span>
                                        <div class="w-2 h-2 rounded-full" [class.bg-green-500]="game.isHostTurn" [class.bg-gray-300]="!game.isHostTurn"></div>
                                    </div>
                                </div>
                                
                                <!-- Non-Interactive Preview Board -->
                                <div class="flex-1 aspect-square relative z-0 pointer-events-none">
                                    <app-chess-board 
                                        [fen]="game.fen" 
                                        [lastMove]="game.lastMove"
                                        [isInteractive]="false" 
                                        [allowedColor]="'w'">
                                    </app-chess-board>
                                </div>
                                
                                <!-- Overlay Action Button -->
                                @if (game.isHostTurn) {
                                    <div class="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button class="bg-red-500 text-white font-black uppercase text-xs px-3 py-1 shadow-lg transform scale-110">JOUER</button>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>
            } 
            
            <!-- Focused Mode (One Board) -->
            @else if (focusedGame(); as game) {
                 <div class="flex-1 flex flex-col md:flex-row bg-gray-100 dark:bg-[#121212] h-full">
                     
                     <!-- Game Board Area -->
                     <div class="flex-1 flex items-center justify-center p-4 md:p-8 bg-nano-banana relative">
                         <button (click)="exitFocus()" class="absolute top-4 left-4 bg-white border-2 border-[#1D1C1C] px-3 py-1 font-bold text-sm hover:bg-[#FFF48D] z-20 wero-shadow-sm flex items-center">
                             <span class="text-lg mr-1">⊞</span> GRILLE (ESC)
                         </button>
                         
                         <!-- Navigation Arrows -->
                         <button (click)="cycleGame(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 bg-white border-2 border-[#1D1C1C] w-12 h-12 flex items-center justify-center hover:bg-gray-100 z-20 wero-shadow-sm font-black text-xl">←</button>
                         <button (click)="cycleGame(1)" class="absolute right-4 top-1/2 -translate-y-1/2 bg-white border-2 border-[#1D1C1C] w-12 h-12 flex items-center justify-center hover:bg-gray-100 z-20 wero-shadow-sm font-black text-xl">→</button>

                         <div class="w-full max-w-[85vh] aspect-square bg-white dark:bg-black border-4 border-[#1D1C1C] dark:border-white shadow-2xl relative">
                             <!-- Action Indicator inside board -->
                             @if (game.isHostTurn) {
                                 <div class="absolute top-0 w-full h-2 bg-red-500 z-30 animate-pulse"></div>
                             }
                             
                             <app-chess-board 
                                [fen]="game.fen" 
                                [lastMove]="game.lastMove"
                                [isInteractive]="game.isHostTurn"
                                [allowedColor]="'w'"
                                (move)="onMove(game.id, $event)">
                             </app-chess-board>
                         </div>
                     </div>

                     <!-- Info Panel (Right) -->
                     <div class="w-full md:w-80 bg-white dark:bg-[#1a1a1a] border-l-2 border-[#1D1C1C] dark:border-white flex flex-col z-20 shadow-xl">
                         
                         <!-- Challenger Profile -->
                         <div class="p-6 border-b-2 border-[#1D1C1C] dark:border-white text-center bg-gray-50 dark:bg-[#0f0f0f]">
                             <img [src]="game.opponentAvatar" class="w-20 h-20 mx-auto border-4 border-[#1D1C1C] bg-white rounded-full mb-3 shadow-sm">
                             <h3 class="text-xl font-black font-display uppercase truncate">{{ game.opponentName }}</h3>
                             <p class="text-sm text-gray-500 font-mono font-bold">{{ game.opponentRating }} ELO</p>
                             <div class="mt-4 inline-block bg-[#1D1C1C] text-white px-3 py-1 font-mono font-bold text-lg rounded-[2px]">
                                 {{ formatTime(game.whiteTime) }}
                             </div>
                         </div>

                         <!-- Content Area (Simplified to Moves for focus) -->
                         <div class="flex-1 overflow-y-auto bg-white dark:bg-[#121212] flex flex-col p-4">
                             <h4 class="text-xs font-black uppercase text-gray-400 mb-2 border-b border-gray-200 pb-1">Derniers coups</h4>
                             <div class="font-mono text-xs space-y-1">
                                 @for (move of game.history.slice(-10); track $index) {
                                     @if ($index % 2 === 0) {
                                         <div class="flex border-b border-gray-100 dark:border-gray-800 py-1">
                                            <span class="w-8 text-gray-400 select-none">...</span>
                                            <span class="w-16 font-bold text-[#1D1C1C] dark:text-gray-300">{{ move }}</span>
                                            <span class="w-16 font-bold text-[#1D1C1C] dark:text-gray-300">{{ game.history.slice(-10)[$index+1] || '' }}</span>
                                         </div>
                                     }
                                 }
                             </div>
                         </div>

                         <!-- Footer -->
                         <div class="p-4 border-t-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#0f0f0f]">
                             <button class="w-full py-3 bg-white border-2 border-red-500 text-red-600 font-black uppercase hover:bg-red-50 text-sm shadow-sm">
                                 Déclarer Victoire / Nulle
                             </button>
                         </div>
                     </div>
                 </div>
            }

        </main>

    </div>
  `
})
export class SimulHostComponent {
  private simulService = inject(ChessSimulService);
  
  games = this.simulService.games;
  
  focusedGameId = signal<number | null>(null);

  // Computed helpers
  activeCount = computed(() => this.games().filter(g => g.status === 'active').length);
  actionRequiredGames = computed(() => this.games().filter(g => g.status === 'active' && g.isHostTurn));
  waitingGames = computed(() => this.games().filter(g => g.status === 'active' && !g.isHostTurn));
  actionRequiredCount = computed(() => this.actionRequiredGames().length);
  waitingCount = computed(() => this.waitingGames().length);

  focusedGame = computed(() => {
      const id = this.focusedGameId();
      return id !== null ? this.games().find(g => g.id === id) : null;
  });

  isFocusedMode = computed(() => this.focusedGameId() !== null);

  // Keyboard Shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
      if (event.key === 'Escape') {
          this.exitFocus();
      }
      if (event.key === 'ArrowRight') {
          this.cycleGame(1);
      }
      if (event.key === 'ArrowLeft') {
          this.cycleGame(-1);
      }
      
      // Number keys 1-9 to select priority games
      const num = parseInt(event.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
          const priorityGames = this.actionRequiredGames();
          if (priorityGames[num - 1]) {
              this.focusGame(priorityGames[num - 1].id);
          }
      }
  }

  focusGame(id: number) {
      this.focusedGameId.set(id);
  }

  exitFocus() {
      this.focusedGameId.set(null);
  }

  cycleGame(direction: number) {
      const games = this.games(); // Cycle through all or just active? Let's cycle all active.
      const active = games.filter(g => g.status === 'active');
      if (active.length === 0) return;

      const currentId = this.focusedGameId();
      let currentIndex = active.findIndex(g => g.id === currentId);

      if (currentIndex === -1) currentIndex = 0;
      else {
          currentIndex = (currentIndex + direction + active.length) % active.length;
      }
      
      this.focusGame(active[currentIndex].id);
  }

  onMove(gameId: number, move: { from: string, to: string }) {
      this.simulService.makeMove(gameId, move.from, move.to);
      // Optional: Auto-advance to next priority game?
      // const next = this.actionRequiredGames().find(g => g.id !== gameId);
      // if (next) this.focusGame(next.id);
  }

  formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
