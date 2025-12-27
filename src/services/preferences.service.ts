
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
  { id: 'purple', name: 'Violet', light: '#e2e2ee', dark: '#6f5f90' },
];

export const PIECE_SETS = [
  { id: 'cburnett', name: 'Alpha (Lichess)' },
  { id: 'merida', name: 'Merida' },
  { id: 'leipzig', name: 'Leipzig' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'spatial', name: 'Spatial' },
];

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  // Signaux pour l'état - Default light mode
  activeThemeId = signal<string>('wero');
  activePieceSetId = signal<string>('cburnett');
  darkMode = signal<boolean>(false);

  // Computed helpers
  get currentTheme() {
    return BOARD_THEMES.find(t => t.id === this.activeThemeId()) || BOARD_THEMES[0];
  }

  constructor() {
    // Charger depuis le localStorage
    const savedTheme = localStorage.getItem('simul_theme');
    const savedPiece = localStorage.getItem('simul_piece');
    const savedDark = localStorage.getItem('simul_dark');

    if (savedTheme) this.activeThemeId.set(savedTheme);
    if (savedPiece) this.activePieceSetId.set(savedPiece);
    if (savedDark) {
        // Strict parsing
        this.darkMode.set(JSON.parse(savedDark));
    } else {
        // Ensure explicit default false if nothing saved
        this.darkMode.set(false); 
    }

    // Sauvegarder automatiquement
    effect(() => {
      localStorage.setItem('simul_theme', this.activeThemeId());
      localStorage.setItem('simul_piece', this.activePieceSetId());
      localStorage.setItem('simul_dark', JSON.stringify(this.darkMode()));
      
      // Apply class to body
      if (this.darkMode()) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    });
  }

  toggleDarkMode() {
    this.darkMode.update(d => !d);
  }
}
