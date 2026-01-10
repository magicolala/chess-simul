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
      <div class="h-full flex flex-col max-w-6xl mx-auto p-4">
        <button
          routerLink="/game"
          class="self-start mb-4 text-sm font-bold font-display text-gray-500 hover:text-[#1D1C1C] dark:hover:text-white flex items-center"
        >
          ← Retour
        </button>
        <div class="flex-1 bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow flex flex-col md:flex-row overflow-hidden">
          
          <!-- Sidebar Info -->
          <div class="w-full md:w-80 border-r-2 border-[#1D1C1C] dark:border-white flex flex-col bg-gray-50 dark:bg-[#121212]">
            <div class="p-6 border-b-2 border-[#1D1C1C] dark:border-white text-center">
              <h2 class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white uppercase">
                {{ game.opponentName }}
              </h2>
              <p class="text-xs font-bold text-gray-500 uppercase mt-1">{{ game.variant }} • {{ game.difficulty }}</p>
            </div>
            
            <!-- Turn Indicator -->
            <div class="p-4 flex items-center justify-center space-x-2" 
                 [class.bg-[#FFF48D]]="game.status === 'active' && game.turn === 'w'"
                 [class.bg-[#1D1C1C]]="game.status === 'active' && game.turn === 'b'"
                 [class.text-white]="game.status === 'active' && game.turn === 'b'">
               <span class="font-black uppercase text-sm">
                 {{ game.status === 'active' ? (game.turn === 'w' ? 'Trait aux Blancs' : 'Trait aux Noirs') : game.status }}
               </span>
            </div>

            <!-- Fake Moves List (Placeholder) -->
            <div class="flex-1 p-4 overflow-y-auto font-mono text-xs">
               <div *ngFor="let fen of game.fenHistory; let i = index">
                  {{ i }}. {{ fen.split(' ')[0] }}...
               </div>
            </div>
          </div>

          <!-- Board Area -->
          <div class="flex-1 bg-[#e0e0e0] dark:bg-[#000] flex items-center justify-center p-4 md:p-10 relative">
            <div class="w-full max-w-[80vh] aspect-square wero-shadow">
              <app-chess-board
                [fen]="getDisplayFen(game)"
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
              <div class="absolute left-1/2 -translate-x-1/2 bottom-4 bg-[#1D1C1C] text-white text-xs font-black px-4 py-2 rounded-[2px] border border-white">
                {{ forcedPieceMessage() }}
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="p-8 text-center text-gray-500 font-bold">Partie introuvable</div>
    }
  `
})
export class LocalPlayPageComponent {
  logicService = inject(ChessSimulService);
  route = inject(ActivatedRoute);
  
  isBoardFlipped = signal(false); // Could be persisted or derived
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

  getDisplayFen(game: GameState): string {
    // Simplified logic, assume viewIndex handled in service or defaulting to latest
    return game.fen;
  }
}
