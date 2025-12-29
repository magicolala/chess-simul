
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HydraGameEngineService } from '../services/hydra-game-engine.service';
import { ChessBoardComponent } from './chess-board.component'; // Reuse existing component
import { FormsModule } from '@angular/forms'; // For input fields
import { AuthService } from '../services/auth.service'; // Import AuthService

@Component({
  selector: 'app-hydra-game',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Hydra Chess (MVP Phase 1)</h2>
      <div *ngIf="authService.currentUser()">
        <p class="text-lg font-medium text-white">Your ELO: {{ authService.currentUser()?.elo }}</p>
      </div>

      <div class="flex space-x-4 mb-4">
        <select [(ngModel)]="selectedPlayerColor" class="p-2 border rounded">
          <option value="w">Play as White</option>
          <option value="b">Play as Black</option>
        </select>
        <select [(ngModel)]="selectedBotSkill" class="p-2 border rounded">
          <option value="easy">Easy Bot</option>
          <option value="medium">Medium Bot</option>
          <option value="hard">Hard Bot</option>
        </select>
        <input type="number" [(ngModel)]="initialTime" placeholder="Minutes" class="p-2 border rounded w-24" />
        <input type="number" [(ngModel)]="increment" placeholder="Increment" class="p-2 border rounded w-24" />
        <button (click)="addBotGame()" class="bg-blue-500 text-white px-4 py-2 rounded">Add Bot Game</button>
      </div>

      <div class="grid gap-4" [ngClass]="getGridClass()">
        @for (game of hydraGameEngine.games(); track game.id) {
          <div class="relative rounded-lg shadow-md bg-gray-800 p-2" [class.border-4]="game.opponentJustMoved" [class.border-green-500]="game.opponentJustMoved" [class.animate-pulse]="game.opponentJustMoved">
            <h3 class="text-lg font-semibold text-white mb-2">{{ game.playerColor === 'w' ? 'White' : 'Black' }} vs Bot ({{ game.botSkill }})</h3>
            <p class="text-gray-400 text-sm">Game ID: {{ game.id }}</p>
            <p class="text-gray-400 text-sm">Status: {{ game.status }}</p>
            <p class="text-gray-400 text-sm">
              Time W: {{ (game.timeRemaining.white / 1000) | number:'1.0-0' }}s | B: {{ (game.timeRemaining.black / 1000) | number:'1.0-0' }}s
            </p>
            <app-chess-board
              [fen]="game.fen"
              [lastMove]="game.lastMove"
              [isInteractive]="true"
              [orientation]="game.playerColor"
              [allowedColor]="game.playerColor"
              [isFocused]="game.opponentJustMoved"
              (move)="handlePlayerMove(game.id, $event)"
            />
            <button (click)="removeGame(game.id)" class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">Remove</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class HydraGameComponent implements OnInit {
  hydraGameEngine = inject(HydraGameEngineService);
  authService = inject(AuthService);

  selectedPlayerColor: 'w' | 'b' = 'w';
  selectedBotSkill: 'easy' | 'medium' | 'hard' = 'easy';
  initialTime: number = 5; // minutes
  increment: number = 3; // seconds

  constructor() {}

  ngOnInit(): void {
    // Optionally add an initial game
    // this.addBotGame();
  }

  addBotGame() {
    this.hydraGameEngine.createBotGame(
      this.initialTime,
      this.increment,
      this.selectedPlayerColor,
      this.selectedBotSkill
    );
  }

  handlePlayerMove(gameId: string, event: { from: string, to: string }) {
    this.hydraGameEngine.makeMove(gameId, event.from, event.to);
  }

  removeGame(gameId: string) {
    this.hydraGameEngine.removeGame(gameId);
  }

  getGridClass(): string {
    const gameCount = this.hydraGameEngine.games().length;
    if (gameCount === 1) return 'grid-cols-1';
    if (gameCount >= 2 && gameCount <= 4) return 'grid-cols-2';
    if (gameCount >= 5 && gameCount <= 9) return 'grid-cols-3';
    return 'grid-cols-4'; // Fallback for more than 9, or adjust as needed
  }
}
