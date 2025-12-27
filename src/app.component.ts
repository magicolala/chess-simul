
import { Component, inject, computed, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessSimulService, GameState, GameConfig } from './services/chess-logic.service';
import { AuthService } from './services/auth.service';
import { HistoryService } from './services/history.service';
import { PreferencesService } from './services/preferences.service';
import { MultiplayerService } from './services/multiplayer.service';
import { SimulService } from './services/simul.service';

import { ChessBoardComponent } from './components/chess-board.component';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { SettingsComponent } from './components/settings.component';
import { HistoryComponent } from './components/history.component';
import { FriendLobbyComponent } from './components/friend-lobby.component';
import { LandingComponent } from './components/landing.component';
import { SimulCreateComponent } from './components/simul-create.component';
import { SimulHostComponent } from './components/simul-host.component';
import { SimulListComponent } from './components/simul-list.component';
import { SimulLobbyComponent } from './components/simul-lobby.component';
import { SimulPlayerComponent } from './components/simul-player.component';
import { VerifyEmailComponent } from './components/verify-email.component';
import { OnboardingComponent } from './components/onboarding.component';
import { ForgotPasswordComponent } from './components/forgot-password.component';
import { DashboardComponent } from './components/dashboard.component';
import { MultiplayerLobbyComponent } from './components/multiplayer-lobby.component';
import { GameRoomComponent } from './components/game-room.component';
import { OnlineGameComponent } from './components/online-game.component';

type ViewState = 'landing' | 'login' | 'register' | 'forgot-password' | 'verify-email' | 'onboarding' | 'dashboard' | 'history' | 'game' | 'focus' | 'friend-lobby' | 'simul-create' | 'simul-host' | 'simul-list' | 'simul-lobby' | 'simul-player' | 'multiplayer-lobby' | 'game-room' | 'online-game';

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
    LandingComponent,
    SimulCreateComponent,
    SimulHostComponent,
    SimulListComponent,
    SimulLobbyComponent,
    SimulPlayerComponent,
    VerifyEmailComponent,
    OnboardingComponent,
    ForgotPasswordComponent,
    DashboardComponent,
    MultiplayerLobbyComponent,
    GameRoomComponent,
    OnlineGameComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private logicService = inject(ChessSimulService);
  auth = inject(AuthService);
  historyService = inject(HistoryService);
  prefs = inject(PreferencesService);
  mpService = inject(MultiplayerService);
  simulService = inject(SimulService);

  currentView = signal<ViewState>('landing');
  
  // UI State for Modals
  showNewGameModal = signal(false);
  showSettingsModal = signal(false);
  showGameOverModal = signal<GameState | null>(null);

  focusedGameId = signal<number | null>(null);
  isBoardFlipped = signal(false);

  newGameConfig = signal<GameConfig>({
      timeMinutes: 10,
      incrementSeconds: 0,
      opponentCount: 1, 
      difficulty: 'pvp'
  });

  games = this.logicService.games;

  activeGamesCount = computed(() => 
    this.games().filter(g => g.status === 'active').length
  );
  
  focusedGame = computed(() => {
     const id = this.focusedGameId();
     return id !== null ? this.games().find(g => g.id === id) : null;
  });

  totalGamesPlayed = computed(() => this.historyService.history().length);
  totalWins = computed(() => this.historyService.history().filter(g => g.result === 'win').length);
  currentElo = signal(1200); 

  constructor() {
      // Routing Logic based on Auth State
      effect(() => {
          const user = this.auth.currentUser();
          
          if (!user) {
              const publicViews: ViewState[] = ['login', 'register', 'forgot-password', 'landing'];
              if (!publicViews.includes(this.currentView())) {
                  this.currentView.set('landing');
              }
              return;
          }

          if (!user.emailVerified) {
              this.currentView.set('verify-email');
          } else if (!user.onboardingCompleted) {
              this.currentView.set('onboarding');
          } else {
              const authViews: ViewState[] = ['landing', 'login', 'register', 'verify-email', 'onboarding', 'forgot-password'];
              if (authViews.includes(this.currentView())) {
                  this.currentView.set('dashboard');
              }
          }
      }, { allowSignalWrites: true });
  }

  onMove(gameId: number, move: { from: string, to: string }) {
    this.logicService.makeMove(gameId, move.from, move.to);
    
    const game = this.games().find(g => g.id === gameId);
    if (game && game.status !== 'active' && game.status !== 'waiting' && game.mode !== 'online' && game.mode !== 'simul-player') {
        setTimeout(() => this.showGameOverModal.set(game), 1000);
    }
  }

  // --- Helpers ---
  getDisplayFen(game: GameState): string {
    if (game.viewIndex === -1) return game.fen;
    return game.fenHistory[game.viewIndex] || game.fen;
  }

  getDisplayLastMove(game: GameState): { from: string, to: string } | null {
      if (game.viewIndex === -1) return game.lastMove;
      return null;
  }

  navigateGame(gameId: number, direction: 'start' | 'prev' | 'next' | 'end') {
      this.logicService.navigateHistory(gameId, direction);
  }

  isAtLatest(game: GameState): boolean {
      return game.viewIndex === -1;
  }

  // --- Modal / View Logic ---
  openNewGameModal() { this.showNewGameModal.set(true); }
  openSettings() { this.showSettingsModal.set(true); }
  closeSettings() { this.showSettingsModal.set(false); }

  startNewSession() {
    this.logicService.startPvpSession(this.newGameConfig());
    this.showNewGameModal.set(false);
    this.currentView.set('game'); 
  }

  handleQuickPlay(config: { time: number, inc: number }) {
      this.newGameConfig.set({
          timeMinutes: config.time,
          incrementSeconds: config.inc,
          opponentCount: 1,
          difficulty: 'pvp'
      });
      this.startNewSession();
  }

  startFriendGame(config: { time: number, inc: number, color: 'w' | 'b' | 'random' }) {
      this.newGameConfig.set({ timeMinutes: config.time, incrementSeconds: config.inc, opponentCount: 1, difficulty: 'pvp' });
      this.logicService.startPvpSession(this.newGameConfig());
      this.enterFocusMode(0); 
      this.isBoardFlipped.set(config.color === 'b'); 
  }
  
  // Simul Logic
  createSimul(config: GameConfig) {
      this.simulService.createSimul(config, false); // Default public
      this.currentView.set('simul-lobby');
  }

  joinSimul(id: string) {
      this.simulService.joinSimul(id);
      this.currentView.set('simul-lobby');
  }

  leaveSimulLobby() {
      this.simulService.leaveSimul();
      this.currentView.set('simul-list');
  }

  startSimulHost() {
      // 1. Mark simul as started in meta-service
      this.simulService.startSimul();
      
      // 2. Initialize game logic for host
      const simul = this.simulService.currentSimul();
      if(simul) {
          this.logicService.startSimulHosting(simul.config);
          this.currentView.set('simul-host');
      }
  }

  startSimulPlayer() {
      // Player view logic handles its own initialization based on currentSimul
      this.currentView.set('simul-player');
  }


  enterFocusMode(gameId: number) {
      this.focusedGameId.set(gameId);
      this.currentView.set('focus');
  }

  exitFocusMode() {
      this.currentView.set('game');
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
  
  isLowTime(ms: number): boolean { return ms > 0 && ms < 30000; }
  
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
    // Handled by effect
  }

  updateTimeConfig(minutes: number) {
    this.newGameConfig.update(c => ({...c, timeMinutes: minutes}));
  }

  toggleBoardFlip() {
      this.isBoardFlipped.update(v => !v);
  }

  handleMpJoined() {
      this.currentView.set('game-room');
  }

  handleGameStart() {
      this.currentView.set('online-game');
  }
}
