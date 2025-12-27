
import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessSimulService, GameState, GameConfig } from './services/chess-logic.service';
import { AuthService } from './services/auth.service';
import { HistoryService } from './services/history.service';
import { PreferencesService } from './services/preferences.service';
import { ChessBoardComponent } from './components/chess-board.component';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { SettingsComponent } from './components/settings.component';
import { HistoryComponent } from './components/history.component';
import { FriendLobbyComponent } from './components/friend-lobby.component';
import { LandingComponent } from './components/landing.component';

type ViewState = 'landing' | 'login' | 'register' | 'dashboard' | 'history' | 'game' | 'focus' | 'friend-lobby';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ChessBoardComponent, 
    LoginComponent, 
    RegisterComponent, 
    SettingsComponent, 
    HistoryComponent, 
    FriendLobbyComponent,
    LandingComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private simulService = inject(ChessSimulService);
  auth = inject(AuthService);
  historyService = inject(HistoryService);
  prefs = inject(PreferencesService);

  // Default to landing if no user, otherwise logic in constructor handles it
  currentView = signal<ViewState>('landing');
  
  // UI State for Modals
  showNewGameModal = signal(false);
  showSettingsModal = signal(false);
  showGameOverModal = signal<GameState | null>(null);

  // Focus Game State
  focusedGameId = signal<number | null>(null);
  
  // Friend Game Flip State
  isBoardFlipped = signal(false);

  // New Game Form Data
  newGameConfig = signal<GameConfig>({
      timeMinutes: 10,
      incrementSeconds: 0,
      opponentCount: 1, // Default to 1 for PvP
      difficulty: 'pvp'
  });

  games = this.simulService.games;

  // Stats Computeds
  activeGamesCount = computed(() => 
    this.games().filter(g => g.status === 'active').length
  );
  
  // Get Focus Game
  focusedGame = computed(() => {
     const id = this.focusedGameId();
     return id !== null ? this.games().find(g => g.id === id) : null;
  });

  totalGamesPlayed = computed(() => this.historyService.history().length);
  
  totalWins = computed(() => 
    this.historyService.history().filter(g => g.result === 'win').length
  );

  currentElo = signal(1200); 

  recentGames = computed(() => this.historyService.history().slice(0, 5));

  constructor() {
    if (this.auth.currentUser()) {
      this.currentView.set('dashboard');
    } else {
      this.currentView.set('landing');
    }
  }

  onMove(gameId: number, move: { from: string, to: string }) {
    this.simulService.makeMove(gameId, move.from, move.to);
    
    // Check if game ended immediately after move
    const game = this.games().find(g => g.id === gameId);
    if (game && game.status !== 'active' && game.status !== 'waiting') {
        setTimeout(() => this.showGameOverModal.set(game), 1000);
    }
  }

  // --- Display Helpers for History Navigation ---

  getDisplayFen(game: GameState): string {
    if (game.viewIndex === -1) {
        return game.fen;
    }
    return game.fenHistory[game.viewIndex] || game.fen;
  }

  getDisplayLastMove(game: GameState): { from: string, to: string } | null {
      if (game.viewIndex === -1) {
          return game.lastMove;
      }
      return null;
  }

  navigateGame(gameId: number, direction: 'start' | 'prev' | 'next' | 'end') {
      this.simulService.navigateHistory(gameId, direction);
  }

  isAtLatest(game: GameState): boolean {
      return game.viewIndex === -1;
  }

  // ----------------------------------------------

  openNewGameModal() {
    this.showNewGameModal.set(true);
  }

  openSettings() {
      this.showSettingsModal.set(true);
  }

  closeSettings() {
      this.showSettingsModal.set(false);
  }

  startNewSession() {
    this.simulService.startPvpSession(this.newGameConfig());
    this.showNewGameModal.set(false);
    this.currentView.set('game'); // Go directly to game view
  }

  startFriendGame(config: { time: number, inc: number, color: 'w' | 'b' | 'random' }) {
      // Use the standard session starter for consistency in this PvP version
      this.newGameConfig.set({
          timeMinutes: config.time,
          incrementSeconds: config.inc,
          opponentCount: 1,
          difficulty: 'pvp'
      });
      this.simulService.startPvpSession(this.newGameConfig());
      this.enterFocusMode(0); // Assuming ID 0 for single game
      this.isBoardFlipped.set(config.color === 'b'); 
  }

  enterFocusMode(gameId: number) {
      this.focusedGameId.set(gameId);
      this.currentView.set('focus');
  }

  exitFocusMode() {
      // If we are in friend mode, exiting focus might mean ending session or going back to lobby
      const game = this.focusedGame();
      if (game?.mode === 'local' || game?.mode === 'online') {
          this.currentView.set('game'); // Back to table view
      } else {
          this.currentView.set('game');
      }
      this.focusedGameId.set(null);
  }

  analyzeOnLichess(fen: string) {
      const url = `https://lichess.org/analysis/standard/${fen.replace(/\s/g, '_')}`;
      window.open(url, '_blank');
  }

  formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  isLowTime(ms: number): boolean {
      return ms > 0 && ms < 30000; // Under 30 seconds
  }
  
  getTimePercentage(current: number, initial: number): string {
      if (!initial || initial === 0) return '0%';
      const pct = (current / initial) * 100;
      return `${Math.max(0, Math.min(100, pct))}%`;
  }

  switchView(view: ViewState) {
    this.currentView.set(view);
  }

  handleLogout() {
    this.auth.logout();
    this.currentView.set('landing'); // Return to landing on logout
  }

  updateTimeConfig(minutes: number) {
    this.newGameConfig.update(c => ({...c, timeMinutes: minutes}));
  }

  updateOpponentCount(count: number) {
    this.newGameConfig.update(c => ({...c, opponentCount: count}));
  }

  toggleBoardFlip() {
      this.isBoardFlipped.update(v => !v);
  }
}
