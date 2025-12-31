import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HydraGameEngineService } from '../services/hydra-game-engine.service';
import { ChessBoardComponent } from './chess-board.component'; // Reuse existing component
import { FormsModule } from '@angular/forms'; // For input fields
import { AuthService } from '../services/auth.service'; // Import AuthService
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-hydra-game',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    <div class="p-4 font-sans">
      <h2 class="text-2xl font-black font-display uppercase mb-4">Hydra Chess (MVP Phase 1)</h2>
      <div *ngIf="authService.currentUser()">
        <p class="text-sm font-bold text-gray-500">
          Your ELO: {{ authService.currentUser()?.elo }}
        </p>
      </div>

      <div class="ui-card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label class="ui-label">Couleur</label>
          <select [(ngModel)]="selectedPlayerColor" class="ui-input">
            <option value="w">Play as White</option>
            <option value="b">Play as Black</option>
          </select>
        </div>
        <div>
          <label class="ui-label">Niveau</label>
          <select [(ngModel)]="selectedBotSkill" class="ui-input">
            <option value="easy">Easy Bot</option>
            <option value="medium">Medium Bot</option>
            <option value="hard">Hard Bot</option>
          </select>
        </div>
        <div>
          <label class="ui-label">Minutes</label>
          <input
            type="number"
            [(ngModel)]="initialTime"
            placeholder="Minutes"
            class="ui-input w-24"
          />
        </div>
        <div>
          <label class="ui-label">Increment</label>
          <input
            type="number"
            [(ngModel)]="increment"
            placeholder="Increment"
            class="ui-input w-24"
          />
        </div>
        <button (click)="addBotGame()" class="ui-btn ui-btn-primary px-4 py-2">Add Bot Game</button>
      </div>

      <div class="grid gap-4" [ngClass]="getGridClass()">
        @for (game of hydraGameEngine.games(); track game.id) {
          <div
            class="ui-card relative p-2"
            [class.ring-4]="game.opponentJustMoved"
            [class.ring-green-500]="game.opponentJustMoved"
            [class.animate-pulse]="game.opponentJustMoved"
          >
            <h3 class="text-lg font-black font-display mb-2">
              {{ game.playerColor === 'w' ? 'White' : 'Black' }} vs Bot ({{ game.botSkill }})
            </h3>
            <p class="text-gray-500 text-sm">Game ID: {{ game.id }}</p>
            <p class="text-gray-500 text-sm">Status: {{ game.status }}</p>
            <p class="text-gray-500 text-sm">
              Time W: {{ game.timeRemaining.white / 1000 | number: '1.0-0' }}s | B:
              {{ game.timeRemaining.black / 1000 | number: '1.0-0' }}s
            </p>
            <app-chess-board
              [fen]="game.fen"
              [lastMove]="game.lastMove"
              [isInteractive]="true"
              [orientation]="game.playerColor"
              [allowedColor]="game.playerColor"
              [isFocused]="game.opponentJustMoved"
              [allowPremoves]="prefs.gameSettings().allowPremoves"
              (move)="handlePlayerMove(game.id, $event)"
            />
            <button
              (click)="removeGame(game.id)"
              class="ui-btn ui-btn-ghost absolute top-2 right-2 px-2 py-1 text-xs text-red-600"
            >
              Remove
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class HydraGameComponent implements OnInit {
  hydraGameEngine = inject(HydraGameEngineService);
  authService = inject(AuthService);
  prefs = inject(PreferencesService);

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

  handlePlayerMove(gameId: string, event: { from: string; to: string }) {
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
