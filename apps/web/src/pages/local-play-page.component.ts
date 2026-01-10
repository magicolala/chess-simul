import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChessSimulService, GameState } from '../services/chess-logic.service';
import { ChessBoardComponent } from '../components/chess-board.component';

@Component({
  selector: 'app-local-play-page',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, RouterModule],
  template: `
    @if (focusedGame(); as game) {
      <div class="h-full flex flex-col w-full max-w-[1920px] mx-auto p-4 lg:p-6 bg-gray-50 dark:bg-[#0a0a0a]">
        
        <!-- Top Bar -->
        <div class="flex justify-between items-center mb-6">
          <button
            routerLink="/dashboard"
            class="ui-btn ui-btn-ghost flex items-center gap-2 group"
          >
            <span class="group-hover:-translate-x-1 transition-transform">←</span>
            Retour à l'accueil
          </button>
          
          <div class="flex items-center gap-4">
             <div class="text-xs font-bold uppercase tracking-wider text-gray-400">
               {{ game.mode === 'online' ? 'En ligne' : (game.mode === 'local' ? (game.difficulty === 'bot' ? 'Contre Ordinateur' : 'Local') : 'Simultanée') }}
               <span class="mx-2">•</span>
               <span class="text-[#FFF48D]">{{ game.gameMode === 'hand_brain' ? 'Pièce Imposée' : 'Standard' }}</span>
             </div>
             @if(game.status === 'active') {
               <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             }
          </div>
        </div>

        <div class="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          
          <!-- Board Area (Main) -->
          <div class="flex-1 flex justify-center items-center bg-white dark:bg-[#1a1a1a] rounded-[4px] border border-[#1D1C1C] dark:border-gray-800 shadow-sm p-4 relative">
             <!-- Background Pattern -->
             <div class="absolute inset-0 opacity-5 pointer-events-none" style="background-image: radial-gradient(#1D1C1C 1px, transparent 1px); background-size: 20px 20px;"></div>
             
             <div class="w-full max-w-[85vh] aspect-square relative z-10 wero-shadow">
               <app-chess-board
                 [fen]="game.fen"
                 [lastMove]="game.lastMove"
                 [isInteractive]="game.status === 'active'"
                 [allowedColor]="'both'"
                 [orientation]="isBoardFlipped() ? 'b' : 'w'"
                 [forcedFromSquare]="game.brainForcedFromSquare"
                 [brainStatus]="game.brainStatus ?? 'idle'"
                 (move)="onMove(game.id, $event)"
                 (forcedMoveRejected)="handleForcedMoveRejected($event)"
               ></app-chess-board>
             </div>

             @if (forcedPieceMessage()) {
               <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                  <div class="bg-[#1D1C1C] text-[#FFF48D] text-sm font-black px-6 py-3 rounded-full border-2 border-[#FFF48D] shadow-lg">
                    ⚠️ {{ forcedPieceMessage() }}
                  </div>
               </div>
             }
          </div>

          <!-- Sidebar (Info & History) -->
          <div class="w-full lg:w-96 flex flex-col gap-4">
            
            <!-- Turn & Status Card -->
            <div class="ui-card p-0 overflow-hidden">
              <div class="p-4 border-b-2 border-[#1D1C1C] dark:border-white text-center"
                   [class.bg-[#FFF48D]]="game.status === 'active' && game.turn === 'w'"
                   [class.bg-[#1D1C1C]]="game.status === 'active' && game.turn === 'b'"
                   [class.bg-gray-200]="game.status !== 'active'">
                <p class="text-sm font-black uppercase tracking-widest"
                   [class.text-[#1D1C1C]]="game.status === 'active' && game.turn === 'w'"
                   [class.text-white]="game.status === 'active' && game.turn === 'b'"
                   [class.text-gray-500]="game.status !== 'active'">
                  {{ getStatusLabel(game) }}
                </p>
              </div>
              
              <div class="p-6 bg-white dark:bg-[#1a1a1a] flex flex-col gap-4">
                 <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                       <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-[#1D1C1C] text-lg">
                         {{ game.turn === 'b' ? '♟' : '👤' }}
                       </div>
                       <div>
                          <p class="font-bold text-[#1D1C1C] dark:text-gray-200 leading-tight">
                            {{ game.opponentName || 'Adversaire' }}
                          </p>
                          <p class="text-[10px] font-bold text-gray-400 uppercase">Noir</p>
                       </div>
                    </div>
                    <div class="font-mono font-bold text-xl text-gray-400">--:--</div>
                 </div>

                 <div class="h-px w-full bg-gray-100 dark:bg-gray-800"></div>

                 <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                       <div class="w-10 h-10 rounded-full bg-[#FFF48D] flex items-center justify-center border-2 border-[#1D1C1C] text-lg">
                         {{ game.turn === 'w' ? '♟' : '👤' }}
                       </div>
                       <div>
                          <p class="font-bold text-[#1D1C1C] dark:text-gray-200 leading-tight">
                            {{ game.playerName || 'Vous' }}
                          </p>
                          <p class="text-[10px] font-bold text-gray-400 uppercase">Blanc</p>
                       </div>
                    </div>
                    <div class="font-mono font-bold text-xl text-gray-400">--:--</div>
                 </div>
              </div>
            </div>

            <!-- Move History -->
            <div class="ui-card flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">
               <div class="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121212]">
                  <h3 class="text-xs font-black uppercase text-gray-400">Historique des coups</h3>
               </div>
               <div class="flex-1 overflow-y-auto p-0 scrollbar-thin">
                  @if (game.history && game.history.length > 0) {
                     <div class="grid grid-cols-[3rem_1fr_1fr] text-sm font-mono font-bold">
                        @for (movePair of getMovePairs(game.history); track $index) {
                           <div class="p-2 text-center text-gray-400 bg-gray-50 dark:bg-[#121212] border-b border-gray-100 dark:border-gray-800">
                             {{ $index + 1 }}.
                           </div>
                           <div class="p-2 text-center border-b border-gray-100 dark:border-gray-800 hover:bg-[#FFF48D] cursor-pointer transition-colors dark:text-gray-300 dark:hover:text-[#1D1C1C]">
                             {{ movePair[0] }}
                           </div>
                           <div class="p-2 text-center border-b border-gray-100 dark:border-gray-800 hover:bg-[#FFF48D] cursor-pointer transition-colors dark:text-gray-300 dark:hover:text-[#1D1C1C]">
                             {{ movePair[1] || '' }}
                           </div>
                        }
                     </div>
                  } @else {
                     <div class="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 p-8">
                        <span class="text-4xl mb-2">📝</span>
                        <p class="text-xs font-bold uppercase">Aucun coup joué</p>
                     </div>
                  }
               </div>
            </div>

          </div>
        </div>
      </div>
    } @else {
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
            <h1 class="text-4xl font-black text-gray-200 mb-4">404</h1>
            <p class="text-gray-500 font-bold mb-8">Partie introuvable</p>
            <button routerLink="/dashboard" class="ui-btn ui-btn-primary">Retour au Dashboard</button>
        </div>
      </div>
    }
  `
})
export class LocalPlayPageComponent {
  logicService = inject(ChessSimulService);
  route = inject(ActivatedRoute);
  
  isBoardFlipped = signal(false);
  forcedPieceMessage = signal<string | null>(null);

  focusedGameId = computed(() => {
     const id = this.route.snapshot.paramMap.get('id');
     return id ? parseInt(id, 10) : null;
  });

  focusedGame = computed(() => {
    const id = this.focusedGameId();
    return id !== null ? this.logicService.games().find((g) => g.id === id) : null;
  });

  onMove(gameId: number, move: { from: string; to: string }) {
    this.logicService.makeMove(gameId, move.from, move.to);
  }

  handleForcedMoveRejected(message: string) {
    this.forcedPieceMessage.set(message);
    setTimeout(() => this.forcedPieceMessage.set(null), 1500);
  }

  // Helper to pair moves [White, Black]
  getMovePairs(history: string[]): string[][] {
     const pairs: string[][] = [];
     for (let i = 0; i < history.length; i += 2) {
        pairs.push([history[i], history[i+1] || null]);
     }
     return pairs;
  }

  getStatusLabel(game: GameState): string {
    switch(game.status) {
       case 'active': return game.turn === 'w' ? 'Trait aux Blancs' : 'Trait aux Noirs';
       case 'checkmate': return 'Échec et Mat';
       case 'stalemate': return 'Pat';
       case 'draw': return 'Nulle';
       case 'resigned': return 'Abandon';
       case 'timeout': return 'Temps écoulé';
       default: return game.status;
    }
  }
}
