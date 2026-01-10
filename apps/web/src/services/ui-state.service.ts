import { Injectable, signal } from '@angular/core';

export interface GameConfig {
  timeMinutes: number;
  incrementSeconds: number;
  opponentCount: number;
  difficulty: 'pvp' | 'bot'; // Adjusted type
  gameMode: 'standard' | 'hand_brain';
}

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  // Modals
  showNewGameModal = signal(false);
  showSettingsModal = signal(false);
  
  // Auth Modals
  authModalState = signal<'login' | 'register' | 'forgot-password' | null>(null);

  // Game Config
  newGameConfig = signal<GameConfig>({
    timeMinutes: 10,
    incrementSeconds: 0,
    opponentCount: 1,
    difficulty: 'pvp',
    gameMode: 'standard'
  });

  openNewGameModal() {
    this.showNewGameModal.set(true);
  }

  closeNewGameModal() {
    this.showNewGameModal.set(false);
  }

  openSettings() {
    this.showSettingsModal.set(true);
  }

  closeSettings() {
    this.showSettingsModal.set(false);
  }
}
