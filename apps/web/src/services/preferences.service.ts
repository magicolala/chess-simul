import { Injectable, signal, effect } from '@angular/core';

export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'wero', name: 'Wero (Signature)', light: '#FFFFFF', dark: '#FFF48D' },
  { id: 'cyan', name: 'Cyan Pop', light: '#FFFFFF', dark: '#7AF7F7' },
  { id: 'brown', name: 'Bois (Classique)', light: '#f0d9b5', dark: '#b58863' },
  { id: 'terracotta', name: 'Terracotta', light: '#e8e0db', dark: '#bf5f52' },
  { id: 'green', name: 'Vert Tournoi', light: '#ffffdd', dark: '#86a666' },
  { id: 'purple', name: 'Violet', light: '#e2e2ee', dark: '#6f5f90' }
];

export const PIECE_SETS = [
  { id: 'cburnett', name: 'Alpha (Lichess)' },
  { id: 'merida', name: 'Merida' },
  { id: 'leipzig', name: 'Leipzig' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'spatial', name: 'Spatial' }
];

export interface GameSettings {
  autoQueen: boolean;
  confirmResign: boolean;
  inputMethod: 'drag' | 'click' | 'both';
  soundEnabled: boolean;
  animations: boolean;
  allowPremoves: boolean;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  inApp: boolean;
  sound: boolean;
}

export interface PrivacySettings {
  publicProfile: boolean;
  allowChallenges: 'all' | 'friends' | 'none';
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  // Visuals
  activeThemeId = signal<string>('wero');
  activePieceSetId = signal<string>('cburnett');
  darkMode = signal<boolean>(false);

  // Game Logic
  gameSettings = signal<GameSettings>({
    autoQueen: false,
    confirmResign: true,
    inputMethod: 'both',
    soundEnabled: true,
    animations: true,
    allowPremoves: true
  });

  // Notifications
  notifications = signal<NotificationSettings>({
    push: true,
    email: false,
    inApp: true,
    sound: true
  });

  // Privacy
  privacy = signal<PrivacySettings>({
    publicProfile: true,
    allowChallenges: 'all'
  });

  get currentTheme() {
    return BOARD_THEMES.find((t) => t.id === this.activeThemeId()) || BOARD_THEMES[0];
  }

  constructor() {
    this.loadSettings();

    // Auto-save logic
    effect(() => {
      localStorage.setItem('simul_theme', this.activeThemeId());
      localStorage.setItem('simul_piece', this.activePieceSetId());
      localStorage.setItem('simul_dark', JSON.stringify(this.darkMode()));
      localStorage.setItem('simul_game', JSON.stringify(this.gameSettings()));
      localStorage.setItem('simul_notif', JSON.stringify(this.notifications()));
      localStorage.setItem('simul_privacy', JSON.stringify(this.privacy()));

      if (this.darkMode()) document.body.classList.add('dark');
      else document.body.classList.remove('dark');
    });
  }

  toggleDarkMode() {
    this.darkMode.update((d) => !d);
  }

  updateGameSettings(partial: Partial<GameSettings>) {
    this.gameSettings.update((s) => ({ ...s, ...partial }));
  }

  updateNotifications(partial: Partial<NotificationSettings>) {
    this.notifications.update((s) => ({ ...s, ...partial }));
  }

  updatePrivacy(partial: Partial<PrivacySettings>) {
    this.privacy.update((s) => ({ ...s, ...partial }));
  }

  private loadSettings() {
    const sTheme = localStorage.getItem('simul_theme');
    const sPiece = localStorage.getItem('simul_piece');
    const sDark = localStorage.getItem('simul_dark');
    const sGame = localStorage.getItem('simul_game');
    const sNotif = localStorage.getItem('simul_notif');
    const sPriv = localStorage.getItem('simul_privacy');

    if (sTheme) this.activeThemeId.set(sTheme);
    if (sPiece) this.activePieceSetId.set(sPiece);
    if (sDark) this.darkMode.set(JSON.parse(sDark));
    if (sGame) this.gameSettings.set({ ...this.gameSettings(), ...JSON.parse(sGame) });
    if (sNotif) this.notifications.set({ ...this.notifications(), ...JSON.parse(sNotif) });
    if (sPriv) this.privacy.set({ ...this.privacy(), ...JSON.parse(sPriv) });
  }
}
