import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChessSimulService, GameState } from '../services/chess-logic.service';
import { UiStateService } from '../services/ui-state.service';
import { ChessBoardComponent } from '../components/chess-board.component';

@Component({
  selector: 'app-local-game-page',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <div class="max-w-[1920px] mx-auto h-full flex flex-col p-4 md:p-8">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter">
          Table de jeu
        </h2>
        <button
          (click)="openNewGameModal()"
          class="ui-btn ui-btn-primary flex items-center gap-2 shadow-[4px_4px_0px_#1D1C1C] dark:shadow-[4px_4px_0px_#FFF] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span class="text-xl">+</span> Nouvelle Partie
        </button>
      </div>
      
      <!-- List of Local Games -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        @for(game of games(); track game.id) {
           <div class="group relative bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white rounded text-left overflow-hidden wero-shadow hover:-translate-y-1 transition-transform duration-200">
              
              <!-- Card Header -->
              <div class="p-3 border-b-2 border-[#1D1C1C] dark:border-white flex justify-between items-center bg-gray-50 dark:bg-[#121212]">
                <div>
                   <h3 class="font-black text-sm uppercase text-[#1D1C1C] dark:text-gray-200 truncate max-w-[150px]">
                     {{ game.opponentName || 'Adversaire' }}
                   </h3>
                   <p class="text-[10px] font-bold text-gray-500 uppercase">
                     {{ game.difficulty === 'bot' ? 'Contre Ordinateur' : 'Local' }} • {{ game.gameMode === 'hand_brain' ? 'Hand-Brain' : 'Standard' }}
                   </p>
                </div>
                <div class="w-2 h-2 rounded-full" 
                     [class.bg-green-500]="game.status === 'active'"
                     [class.bg-gray-300]="game.status !== 'active'">
                </div>
              </div>

              <!-- Board Preview Area -->
              <div class="p-6 bg-[#e0e0e0] dark:bg-black/50 relative group-hover:bg-[#FFF48D]/20 transition-colors">
                 <div class="aspect-square w-full pointer-events-none grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">
                    <app-chess-board
                      [fen]="game.fen"
                      [isInteractive]="false"
                      [orientation]="'w'"
                    ></app-chess-board>
                 </div>
                 
                 <!-- Hover Overlay -->
                 <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[1px]">
                    <button (click)="resumeGame(game.id)" class="ui-btn ui-btn-primary scale-90 group-hover:scale-100 transition-transform shadow-lg">
                       Reprendre
                    </button>
                 </div>
              </div>

              <!-- Footer info -->
              <div class="p-3 border-t-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#1a1a1a] text-center">
                 <p class="text-xs font-bold text-gray-400 uppercase">
                    {{ game.history?.length || 0 }} coups • {{ game.status }}
                 </p>
              </div>

           </div>
        }
        @if (games().length === 0) {
            <div
            class="col-span-full p-16 border-2 border-dashed border-gray-300 dark:border-gray-700 text-center rounded bg-gray-50 dark:bg-white/5 flex flex-col items-center justify-center gap-4"
            >
              <div class="text-4xl opacity-50">♟️</div>
              <p class="text-gray-400 font-bold uppercase tracking-widest">Aucune partie en cours</p>
              <button (click)="openNewGameModal()" class="text-xs font-bold text-[#1D1C1C] underline decoration-2 underline-offset-4 hover:no-underline">
                 Créer une nouvelle partie
              </button>
            </div>
        }
      </div>
    </div>
  `
})
export class LocalGamePageComponent {
  logicService = inject(ChessSimulService);
  games = this.logicService.games;
  router = inject(Router);
  ui = inject(UiStateService);

  openNewGameModal() {
    this.ui.openNewGameModal();
  }

  resumeGame(id: number) {
    this.router.navigate(['/local', id]);
  }
}
