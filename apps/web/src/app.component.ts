import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessSimulService, GameState, GameConfig } from './services/chess-logic.service';
import { AuthService } from './services/auth.service';
import { HistoryService } from './services/history.service';
import { PreferencesService } from './services/preferences.service';
import { MultiplayerService } from './services/multiplayer.service';
import { SupabaseSimulService } from './services/supabase-simul.service';
import { SupabaseSocialService } from './services/supabase-social.service';
import { AnalysisService } from './services/analysis.service';

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
import { SocialHubComponent } from './components/social-hub.component';
import { PublicProfileComponent } from './components/public-profile.component';
import { AnalysisComponent } from './components/analysis.component';
import { RoundRobinSimulPageComponent } from './pages/round-robin-simul-page.component';

type ViewState =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-email'
  | 'onboarding'
  | 'dashboard'
  | 'history'
  | 'game'
  | 'focus'
  | 'friend-lobby'
  | 'simul-create'
  | 'simul-host'
  | 'simul-list'
  | 'simul-lobby'
  | 'simul-player'
  | 'round-robin-simul'
  | 'multiplayer-lobby'
  | 'game-room'
  | 'online-game'
  | 'social-hub'
  | 'public-profile'
  | 'analysis';

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
    OnlineGameComponent,
    SocialHubComponent,
    PublicProfileComponent,
    AnalysisComponent,
    RoundRobinSimulPageComponent
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
  simulService = inject(SupabaseSimulService);
  socialService = inject(SupabaseSocialService);
  analysisService = inject(AnalysisService);

  currentView = signal<ViewState>('landing');
  viewParam = signal<string>(''); // For profile ID, room ID etc
  authModalModeState = signal<'login' | 'register' | null>(null);

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

  activeGamesCount = computed(() => this.games().filter((g) => g.status === 'active').length);

  focusedGame = computed(() => {
    const id = this.focusedGameId();
    return id !== null ? this.games().find((g) => g.id === id) : null;
  });

  totalGamesPlayed = computed(() => this.historyService.history().length);
  totalWins = computed(
    () => this.historyService.history().filter((g) => g.result === 'win').length
  );
  currentElo = signal(1200);

  constructor() {
    const params = new URLSearchParams(window.location.search);
    const rrSession = params.get('rr_session');
    const rrInvite = params.get('rr_invite');
    const rrGame = params.get('rr_game');
    if (rrGame) {
      this.viewParam.set(rrGame);
      this.currentView.set('game-room');
    } else if (rrInvite) {
      this.currentView.set('round-robin-simul');
      this.viewParam.set(rrInvite);
    } else if (rrSession) {
      this.currentView.set('round-robin-simul');
      this.viewParam.set(rrSession);
    }

    // Routing Logic based on Auth State
    effect(
      () => {
        const user = this.auth.currentUser();

        if (user) {
          this.closeAuthModals();
        }
        if (!user) {
          const publicViews: ViewState[] = ['login', 'register', 'forgot-password', 'landing'];
          if (!publicViews.includes(this.currentView())) {
            this.currentView.set('landing');
          }
          return;
        }

        const emailVerified = user.emailVerified;
        const onboardingCompleted = user.onboardingCompleted;

        if (!emailVerified) {
          this.currentView.set('verify-email');
        } else if (!onboardingCompleted) {
          this.currentView.set('onboarding');
        } else {
          const authViews: ViewState[] = [
            'landing',
            'login',
            'register',
            'verify-email',
            'onboarding',
            'forgot-password'
          ];
          if (authViews.includes(this.currentView())) {
            this.currentView.set('dashboard');
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  onMove(gameId: number, move: { from: string; to: string }) {
    this.logicService.makeMove(gameId, move.from, move.to);

    const game = this.games().find((g) => g.id === gameId);
    if (
      game &&
      game.status !== 'active' &&
      game.status !== 'waiting' &&
      game.mode !== 'online' &&
      game.mode !== 'simul-player'
    ) {
      setTimeout(() => this.showGameOverModal.set(game), 1000);
    }
  }

  // --- Helpers ---
  getDisplayFen(game: GameState): string {
    if (game.viewIndex === -1) return game.fen;
    return game.fenHistory[game.viewIndex] || game.fen;
  }

  getDisplayLastMove(game: GameState): { from: string; to: string } | null {
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
    this.logicService.startPvpSession(this.newGameConfig());
    this.showNewGameModal.set(false);
    this.currentView.set('game');
  }

  handleQuickPlay(config: { time: number; inc: number }) {
    this.newGameConfig.set({
      timeMinutes: config.time,
      incrementSeconds: config.inc,
      opponentCount: 1,
      difficulty: 'pvp'
    });
    this.startNewSession();
  }

  startFriendGame(config: { time: number; inc: number; color: 'w' | 'b' | 'random' }) {
    this.newGameConfig.set({
      timeMinutes: config.time,
      incrementSeconds: config.inc,
      opponentCount: 1,
      difficulty: 'pvp'
    });
    this.logicService.startPvpSession(this.newGameConfig());
    this.enterFocusMode(0);
    this.isBoardFlipped.set(config.color === 'b');
  }

  // Simul Logic
  async createSimul(config: GameConfig) {
    try {
      // For now, we'll use a generic name. In a real app, you might have a form for this.
      const simulName = `Simul by ${this.auth.currentUser()?.email}`;
      const newSimul = await this.simulService.createSimul(simulName, config.opponentCount, {
        initial: config.timeMinutes * 60,
        increment: config.incrementSeconds
      });
      if (newSimul) {
        this.viewParam.set(newSimul.id);
        this.currentView.set('simul-lobby');
      }
    } catch (error) {
      console.error('Error creating simul:', error);
      // Optionally, show an error to the user
    }
  }

  async joinSimul(id: string) {
    try {
      await this.simulService.joinSimul(id);
      this.viewParam.set(id);
      this.currentView.set('simul-lobby');
    } catch (error) {
      console.error('Error joining simul:', error);
    }
  }

  leaveSimulLobby() {
    this.simulService.clearContext();
    this.currentView.set('simul-list');
  }

  async startSimulHost() {
    const tableId = this.simulService.activeTable()?.id;
    if (tableId) {
      try {
        await this.simulService.startTable(tableId);
        // Maybe navigate to a specific view for the host
        this.currentView.set('simul-host');
      } catch (error) {
        console.error('Error starting table:', error);
      }
    }
  }

  startSimulPlayer() {
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

  // --- ANALYSIS ---
  startAnalysis(gameId?: string) {
    if (gameId) {
      // Find game in history to get PGN/FEN sequence (Mocking PGN retrieval)
      // Since our history only stores end FEN, we can't fully replay unless we stored moves.
      // For this demo, let's assume we pass the FEN as "PGN" simply to load the board,
      // or ideally, HistoryService should store the PGN string.
      // Let's create a fake PGN for the demo if not available.

      // In a real app, HistoryService would store the full PGN.
      // We will just pass an empty string to open the board, user can paste PGN.
      this.switchView('analysis', '');
    } else {
      this.switchView('analysis');
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

  getTimePercentage(current: number, initial: number): string {
    if (!initial || initial === 0) return '0%';
    const pct = (current / initial) * 100;
    return `${Math.max(0, Math.min(100, pct))}%`;
  }

  switchView(view: ViewState, param: string = '') {
    if (view === 'login') {
      this.openLoginModal();
      return;
    }

    if (view === 'register') {
      this.openRegisterModal();
      return;
    }

    if (view === 'forgot-password') {
      this.openForgotPassword();
      return;
    }

    this.closeAuthModals();
    this.currentView.set(view);
    this.viewParam.set(param);
  }

  openLoginModal() {
    this.authModalModeState.set('login');
    this.currentView.set('landing');
  }

  openRegisterModal() {
    this.authModalModeState.set('register');
    this.currentView.set('landing');
  }

  openForgotPassword() {
    this.authModalModeState.set(null);
    this.currentView.set('forgot-password');
  }

  closeAuthModals() {
    this.authModalModeState.set(null);
    if (this.currentView() === 'forgot-password') {
      this.currentView.set('landing');
    }
  }

  backToLoginModal() {
    this.currentView.set('landing');
    this.authModalModeState.set('login');
  }

  handleLogout() {
    this.closeAuthModals();
    this.auth.signOut();
  }

  updateTimeConfig(minutes: number) {
    this.newGameConfig.update((c) => ({ ...c, timeMinutes: minutes }));
  }

  toggleBoardFlip() {
    this.isBoardFlipped.update((v) => !v);
  }

  handleMpJoined(gameId?: string | null) {
    if (gameId) {
      this.viewParam.set(gameId);
    }
    this.currentView.set('game-room');
  }

  handleGameStart() {
    this.currentView.set('online-game');
  }
}
