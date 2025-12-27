
import { Component, inject, signal, computed } from '@angular/core';
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
        
        <!-- Sidebar: Queue & Stats -->
        <aside class="w-full md:w-64 bg-white dark:bg-[#1a1a1a] border-r-2 border-[#1D1C1C] dark:border-white flex flex-col z-20">
            <div class="p-4 border-b-2 border-[#1D1C1C] dark:border-white bg-[#FFF48D]">
                <h2 class="font-black font-display text-lg uppercase text-[#1D1C1C]">Simultanée</h2>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs font-bold bg-[#1D1C1C] text-white px-2 py-0.5">HOST</span>
                    <span class="text-xs font-bold text-[#1D1C1C]">{{ activeCount() }} En cours</span>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-2 space-y-2">
                 <h3 class="text-xs font-bold text-gray-500 uppercase pl-2 mt-2 mb-1">À vous de jouer ({{ actionRequiredCount() }})</h3>
                 @for (game of actionRequiredGames(); track game.id) {
                     <div (click)="focusGame(game.id)" class="p-3 border-2 border-[#1D1C1C] bg-white cursor-pointer hover:bg-[#7AF7F7] transition-colors relative"
                          [class.bg-[#7AF7F7]]="focusedGameId() === game.id">
                         <div class="flex justify-between items-center mb-1">
                             <span class="font-black font-display text-sm">#{{ game.id + 1 }}</span>
                             <span class="text-[10px] font-mono font-bold bg-red-500 text-white px-1 rounded">ACTION</span>
                         </div>
                         <div class="text-xs font-medium truncate">{{ game.opponentName }}</div>
                         <div class="text-[10px] text-gray-500">{{ formatTime(game.whiteTime) }}</div>
                     </div>
                 }

                 <h3 class="text-xs font-bold text-gray-500 uppercase pl-2 mt-4 mb-1">En attente ({{ waitingCount() }})</h3>
                 @for (game of waitingGames(); track game.id) {
                     <div (click)="focusGame(game.id)" class="p-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#121212] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 opacity-70">
                         <div class="flex justify-between items-center">
                             <span class="font-bold text-xs text-gray-600 dark:text-gray-400">#{{ game.id + 1 }}</span>
                             <span class="text-[10px] text-gray-400">{{ formatTime(game.whiteTime) }}</span>
                         </div>
                     </div>
                 }
            </div>
        </aside>

        <!-- Main Area -->
        <main class="flex-1 flex flex-col relative overflow-hidden">
            
            <!-- Grid View (Play from Grid enabled) -->
            @if (!isFocusedMode()) {
                <div class="flex-1 overflow-y-auto p-4 bg-nano-banana">
                    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        @for (game of games(); track game.id) {
                            <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white p-2 wero-shadow hover:scale-[1.01] transition-transform relative flex flex-col">
                                
                                <!-- Header / Toolbar -->
                                <div class="mb-2 flex justify-between items-center z-10">
                                    <div class="flex items-center space-x-2">
                                        <span class="font-black font-display text-sm">#{{ game.id + 1 }}</span>
                                        <div class="w-2 h-2 rounded-full"
                                            [class.bg-green-500]="game.isHostTurn"
                                            [class.bg-gray-300]="!game.isHostTurn"
                                            [class.animate-pulse]="game.isHostTurn">
                                        </div>
                                    </div>
                                    <button (click)="focusGame(game.id)" class="text-xs bg-[#1D1C1C] text-white px-2 py-0.5 hover:bg-[#7AF7F7] hover:text-[#1D1C1C] font-bold uppercase transition-colors" title="Plein écran">
                                        ⛶
                                    </button>
                                </div>
                                
                                <!-- Interactive Mini Board -->
                                <div class="flex-1 aspect-square relative z-0">
                                    <app-chess-board 
                                        [fen]="game.fen" 
                                        [lastMove]="game.lastMove"
                                        [isInteractive]="game.isHostTurn"
                                        [allowedColor]="'w'"
                                        (move)="onMove(game.id, $event)">
                                    </app-chess-board>
                                </div>

                                <div class="mt-2 flex justify-between items-end">
                                    <div class="overflow-hidden">
                                        <p class="text-xs font-bold truncate max-w-[80px]">{{ game.opponentName }}</p>
                                    </div>
                                    <span class="font-mono text-xs font-bold" [class.text-red-500]="isLowTime(game.whiteTime)">{{ formatTime(game.whiteTime) }}</span>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            } 
            
            <!-- Focused Mode (Zoomed in + Chat) -->
            @else if (focusedGame(); as game) {
                 <div class="flex-1 flex flex-col md:flex-row bg-gray-100 dark:bg-[#121212]">
                     
                     <!-- Game Board Area -->
                     <div class="flex-1 flex items-center justify-center p-4 md:p-8 bg-nano-banana relative">
                         <button (click)="exitFocus()" class="absolute top-4 left-4 bg-white border-2 border-[#1D1C1C] px-3 py-1 font-bold text-sm hover:bg-[#FFF48D] z-20 wero-shadow-sm">
                             ← GRILLE
                         </button>

                         <div class="w-full max-w-[80vh] aspect-square bg-white dark:bg-black border-4 border-[#1D1C1C] dark:border-white shadow-2xl">
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
                     <div class="w-full md:w-80 bg-white dark:bg-[#1a1a1a] border-l-2 border-[#1D1C1C] dark:border-white flex flex-col">
                         
                         <!-- Header -->
                         <div class="p-6 border-b-2 border-[#1D1C1C] dark:border-white text-center bg-gray-50 dark:bg-[#0f0f0f] relative">
                             <img [src]="game.opponentAvatar" class="w-16 h-16 mx-auto border-2 border-[#1D1C1C] bg-white rounded-full mb-2">
                             <h3 class="text-lg font-black font-display uppercase truncate">{{ game.opponentName }}</h3>
                             <p class="text-xs text-gray-500 font-mono">{{ game.opponentRating }} ELO</p>
                         </div>

                         <!-- Tabs -->
                         <div class="flex border-b-2 border-[#1D1C1C] dark:border-white">
                             <button (click)="activeTab.set('moves')" 
                                class="flex-1 py-3 font-bold text-xs uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                [class.bg-[#1D1C1C]]="activeTab() === 'moves'"
                                [class.text-white]="activeTab() === 'moves'">
                                Coups
                             </button>
                             <button (click)="activeTab.set('chat')" 
                                class="flex-1 py-3 font-bold text-xs uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                [class.bg-[#1D1C1C]]="activeTab() === 'chat'"
                                [class.text-white]="activeTab() === 'chat'">
                                Chat
                             </button>
                         </div>

                         <!-- Content Area -->
                         <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#121212] flex flex-col">
                             
                             <!-- TAB: MOVES -->
                             @if (activeTab() === 'moves') {
                                 <div class="p-4 flex-1">
                                    <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-4">
                                        <p class="text-sm font-bold text-blue-800 dark:text-blue-200">{{ game.systemMessage }}</p>
                                    </div>
                                    <div class="font-mono text-xs space-y-1">
                                        @for (move of game.history; track $index) {
                                            @if ($index % 2 === 0) {
                                                <div class="flex border-b border-gray-200 dark:border-gray-700 py-1">
                                                    <span class="w-8 text-gray-400 select-none">{{ ($index/2)+1 }}.</span>
                                                    <span class="w-16 font-bold text-[#1D1C1C] dark:text-gray-300">{{ move }}</span>
                                                    <span class="w-16 font-bold text-[#1D1C1C] dark:text-gray-300">{{ game.history[$index+1] || '' }}</span>
                                                </div>
                                            }
                                        }
                                    </div>
                                 </div>
                             }

                             <!-- TAB: CHAT -->
                             @if (activeTab() === 'chat') {
                                 <div class="flex-1 p-4 space-y-3 overflow-y-auto">
                                     @for (msg of game.chat; track msg.id) {
                                         <div class="flex flex-col" [class.items-end]="msg.isSelf" [class.items-start]="!msg.isSelf">
                                             <div class="max-w-[85%] p-2 rounded-[2px] border border-gray-200 dark:border-gray-700 text-xs font-medium shadow-sm"
                                                  [class.bg-[#FFF48D]]="msg.isSelf"
                                                  [class.text-[#1D1C1C]]="msg.isSelf"
                                                  [class.bg-white]="!msg.isSelf"
                                                  [class.dark:bg-[#1a1a1a]]="!msg.isSelf"
                                                  [class.dark:text-white]="!msg.isSelf">
                                                 {{ msg.text }}
                                             </div>
                                             <span class="text-[9px] text-gray-400 mt-0.5">{{ msg.isSelf ? 'Vous' : msg.sender }}</span>
                                         </div>
                                     }
                                 </div>
                                 
                                 <!-- Chat Input -->
                                 <div class="p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
                                     <div class="flex space-x-2">
                                         <input type="text" [(ngModel)]="chatInput" (keyup.enter)="sendMessage(game.id)" placeholder="Message..." 
                                            class="flex-1 border-2 border-gray-300 dark:border-gray-600 px-2 py-1 text-xs focus:border-[#1D1C1C] dark:focus:border-white outline-none bg-transparent">
                                         <button (click)="sendMessage(game.id)" class="px-3 py-1 bg-[#1D1C1C] text-white text-xs font-bold uppercase hover:bg-[#7AF7F7] hover:text-[#1D1C1C]">
                                             Envoyer
                                         </button>
                                     </div>
                                 </div>
                             }

                         </div>

                         <!-- Quick Actions Footer -->
                         <div class="p-4 border-t-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#0f0f0f]">
                             <div class="grid grid-cols-2 gap-2">
                                 <button class="py-2 bg-white border border-gray-300 font-bold text-xs uppercase hover:bg-gray-100 text-[#1D1C1C]">Nulle ?</button>
                                 <button class="py-2 bg-white border border-gray-300 font-bold text-xs uppercase hover:bg-red-50 text-red-600">Abandon</button>
                             </div>
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
  activeTab = signal<'moves' | 'chat'>('moves');
  chatInput = signal('');

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

  focusGame(id: number) {
      this.focusedGameId.set(id);
      this.activeTab.set('moves'); // Reset tab to moves when opening
  }

  exitFocus() {
      this.focusedGameId.set(null);
  }

  onMove(gameId: number, move: { from: string, to: string }) {
      this.simulService.makeMove(gameId, move.from, move.to);
  }

  sendMessage(gameId: number) {
      const text = this.chatInput().trim();
      if (text) {
          this.simulService.sendChatMessage(gameId, text);
          this.chatInput.set('');
      }
  }

  formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  isLowTime(ms: number): boolean {
      return ms > 0 && ms < 30000;
  }
}
