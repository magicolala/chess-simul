import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PreferencesService, BOARD_THEMES } from './preferences.service';

describe('PreferencesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreferencesService]
    });
    localStorage.clear();
    document.body.className = '';
  });

  it('loads saved settings from localStorage on creation', () => {
    localStorage.setItem('simul_theme', 'green');
    localStorage.setItem('simul_piece', 'merida');
    localStorage.setItem('simul_dark', 'true');
    localStorage.setItem('simul_game', JSON.stringify({ autoQueen: true, soundEnabled: false }));
    localStorage.setItem('simul_notif', JSON.stringify({ push: false, email: true }));
    localStorage.setItem('simul_privacy', JSON.stringify({ publicProfile: false }));

    const service = TestBed.inject(PreferencesService);
    TestBed.flushEffects();

    expect(service.activeThemeId()).toBe('green');
    expect(service.currentTheme).toEqual(BOARD_THEMES.find(t => t.id === 'green'));
    expect(service.activePieceSetId()).toBe('merida');
    expect(service.darkMode()).toBe(true);
    expect(service.gameSettings().autoQueen).toBe(true);
    expect(service.notifications().email).toBe(true);
    expect(service.privacy().publicProfile).toBe(false);
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('toggles dark mode and persists the value', () => {
    const service = TestBed.inject(PreferencesService);

    service.toggleDarkMode();
    TestBed.flushEffects();

    expect(service.darkMode()).toBe(true);
    expect(localStorage.getItem('simul_dark')).toBe('true');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('merges partial game setting updates', () => {
    const service = TestBed.inject(PreferencesService);

    service.updateGameSettings({ autoQueen: true });
    service.updateGameSettings({ animations: false });

    TestBed.flushEffects();

    expect(service.gameSettings()).toMatchObject({ autoQueen: true, animations: false });
    const storedGame = JSON.parse(localStorage.getItem('simul_game') ?? '{}');
    expect(storedGame.autoQueen).toBe(true);
    expect(storedGame.animations).toBe(false);
  });
});
