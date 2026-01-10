import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChessSimulService } from '../services/chess-logic.service';
import { UiStateService } from '../services/ui-state.service';

@Component({
  selector: 'app-local-game-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-[1920px] mx-auto h-full flex flex-col p-4 md:p-8">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-black font-display text-[#1D1C1C] dark:text-white uppercase">
          Table de jeu
        </h2>
        <button
          (click)="openNewGameModal()"
          class="px-4 py-2 bg-[#FFF48D] text-[#1D1C1C] font-black font-display border-2 border-[#1D1C1C] dark:border-white uppercase text-xs hover:bg-[#7AF7F7]"
        >
          + Partie
        </button>
      </div>
      
      <!-- List of Local Games -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for(game of games(); track game.id) {
           <div class="p-4 border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#1a1a1a]">
              <h3 class="font-bold mb-2">Partie #{{ game.id }}</h3>
              <p class="text-sm text-gray-500 mb-4">{{ game.fen }}</p>
              <button class="ui-btn ui-btn-primary text-xs" (click)="resumeGame(game.id)">Reprendre</button>
           </div>
        }
        @if (games().length === 0) {
            <div
            class="col-span-full p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 text-center rounded-[2px] bg-white dark:bg-[#1a1a1a]"
            >
            <p class="text-gray-400 font-bold">Lancez une partie via le bouton ci-dessus.</p>
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
