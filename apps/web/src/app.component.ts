import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { HistoryService } from './services/history.service';
import { PreferencesService } from './services/preferences.service';
import { SupabaseSimulService } from './services/supabase-simul.service';
import { SupabaseSocialService } from './services/supabase-social.service';
import { SupabaseMatchmakingService } from './services/supabase-matchmaking.service';
import { AnalysisService } from './services/analysis.service';
import { LoggerService } from './services/logger.service';
import { UiStateService } from './services/ui-state.service';
import { ChessSimulService } from './services/chess-logic.service';
import { SettingsComponent } from './components/settings.component';


// Components for Public/Landing are routed now, but Auth Modals might still be used?
// If we use routes /login, we don't need Auth Modals in AppComponent. 
// app.routes.ts has /login.
// So we can assume AppComponent doesn't manage Login/Register modals anymore.

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SettingsComponent,

  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  auth = inject(AuthService);
  logicService = inject(ChessSimulService);
  historyService = inject(HistoryService);
  prefs = inject(PreferencesService);
  simulService = inject(SupabaseSimulService);
  socialService = inject(SupabaseSocialService);
  matchmakingService = inject(SupabaseMatchmakingService);
  analysisService = inject(AnalysisService);
  logger = inject(LoggerService);
  ui = inject(UiStateService);
  router = inject(Router);

  currentElo = computed(() => this.auth.currentUser()?.elo ?? 1200);

  // New Game Modal State (Local)
  // We keep it synced with UI Service if needed, or just use UI service for visibility
  // and local signal for form state.
  // Ideally, move this specific config to UiStateService.
  newGameConfig = this.ui.newGameConfig; // Use the one in service

  constructor() {
    // Watch for matchmaking match - auto-navigate
    effect(() => {
      const gameId = this.matchmakingService.activeGameId();
      const queueStatus = this.matchmakingService.queueStatus();
      
      if (gameId && queueStatus === 'matched') {
         // Prevent redundant navigation
         const currentUrl = this.router.url;
         if (!currentUrl.includes(gameId)) {
             this.logger.info('[AppComponent] ➡️ Navigating to online-game with ID:', gameId);
             this.router.navigate(['/online-game', gameId]);
         }
      }
    });
  }

  handleLogout() {
    this.auth.signOut().then(() => {
        this.router.navigate(['/']);
    });
  }

  // Settings
  openSettings() {
    this.ui.openSettings();
  }
  closeSettings() {
    this.ui.closeSettings();
  }

  // New Game Logic
  updateTimeConfig(minutes: number) {
    this.ui.newGameConfig.update(c => ({ ...c, timeMinutes: minutes }));
  }

  updateGameMode(mode: 'standard' | 'hand_brain') {
    this.ui.newGameConfig.update(c => ({ ...c, gameMode: mode }));
  }

  startNewSession() {
    const config = this.ui.newGameConfig();
    this.logicService.startPvpSession(config);
    this.ui.closeNewGameModal();
    this.router.navigate(['/game']); // Go to game grid (LocalGamePageComponent)
    // Or go to the specific game? logicService doesn't return ID easily here?
    // startPvpSession adds to this.games().
    // We can assume it's the last one or just go to grid.
  }
}
