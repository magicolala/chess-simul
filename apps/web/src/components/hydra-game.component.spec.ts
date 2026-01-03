import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService, type User } from '../services/auth.service';
import { HydraGameComponent } from './hydra-game.component';
import { HydraGameEngineService, type HydraGame } from '../services/hydra-game-engine.service';
import { PreferencesService } from '../services/preferences.service';

class HydraGameEngineServiceStub {
  gamesSignal = signal<HydraGame[]>([]);
  games = () => this.gamesSignal();
  createBotGame = vi.fn();
  makeMove = vi.fn();
  removeGame = vi.fn();
}

class AuthServiceStub {
  currentUser = signal<User | null>({
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    avatar: '',
    isPremium: false,
    emailVerified: true,
    onboardingCompleted: true,
    elo: 1500
  });
}

class PreferencesServiceStub {
  gameSettings = signal({ allowPremoves: true });
}

@Component({
  selector: 'app-chess-board',
  standalone: true,
  template: '',
  inputs: [
    'fen',
    'lastMove',
    'isInteractive',
    'orientation',
    'allowedColor',
    'isFocused',
    'allowPremoves'
  ],
  outputs: ['move']
})
class ChessBoardStubComponent {
  @Input() fen: string | null = null;
  @Input() lastMove: { from: string; to: string } | null = null;
  @Input() isInteractive = true;
  @Input() orientation: 'w' | 'b' = 'w';
  @Input() allowedColor: 'w' | 'b' = 'w';
  @Input() isFocused = false;
  @Input() allowPremoves = false;
  @Output() move = new EventEmitter<{ from: string; to: string }>();
}

describe('HydraGameComponent', () => {
  let fixture: any;
  let component: HydraGameComponent;
  let gameEngine: HydraGameEngineServiceStub;
  let authService: AuthServiceStub;

  const createGame = (overrides: Partial<HydraGame> = {}): HydraGame => ({
    id: 'game-1',
    chess: {} as any,
    fen: 'start',
    lastMove: null,
    plyCount: 0,
    status: 'playing',
    timeRemaining: { white: 3000, black: 3000 },
    increment: 3,
    startTime: Date.now(),
    lastMoveTime: Date.now(),
    playerColor: 'w',
    botSkill: 'easy',
    turn: 'w',
    opponentElo: 1500,
    opponentJustMoved: false,
    lastActivityTime: Date.now(),
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HydraGameComponent, ChessBoardStubComponent],
      providers: [
        { provide: HydraGameEngineService, useClass: HydraGameEngineServiceStub },
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: PreferencesService, useClass: PreferencesServiceStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    TestBed.overrideComponent(HydraGameComponent, {
      set: { imports: [CommonModule, FormsModule, ChessBoardStubComponent] }
    });

    fixture = TestBed.createComponent(HydraGameComponent);
    component = fixture.componentInstance;
    gameEngine = TestBed.inject(HydraGameEngineService) as unknown as HydraGameEngineServiceStub;
    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
  });

  it('renders ELO from the current user', () => {
    authService.currentUser.set({ ...authService.currentUser()!, elo: 1725 });
    fixture.detectChanges();

    const eloText = fixture.nativeElement.textContent;
    expect(eloText).toContain('1725');
  });

  it('calls createBotGame with selected options when clicking Add Bot Game', () => {
    component.selectedPlayerColor = 'b';
    component.selectedBotSkill = 'hard';
    component.initialTime = 10;
    component.increment = 5;
    fixture.detectChanges();

    const addButton = fixture.debugElement.query(By.css('button.ui-btn-primary'));
    addButton.triggerEventHandler('click');

    expect(gameEngine.createBotGame).toHaveBeenCalledWith(10, 5, 'b', 'hard');
  });

  it('delegates handlePlayerMove to makeMove', () => {
    component.handlePlayerMove('game-42', { from: 'e2', to: 'e4' });

    expect(gameEngine.makeMove).toHaveBeenCalledWith('game-42', 'e2', 'e4');
  });

  it('calls removeGame when clicking Remove', () => {
    gameEngine.gamesSignal.set([createGame({ id: 'remove-me' })]);
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css('button.ui-btn-ghost'));
    removeButton.triggerEventHandler('click');

    expect(gameEngine.removeGame).toHaveBeenCalledWith('remove-me');
  });

  it('returns the correct grid class based on game count', () => {
    gameEngine.gamesSignal.set([createGame()]);
    expect(component.getGridClass()).toBe('grid-cols-1');

    gameEngine.gamesSignal.set([createGame(), createGame({ id: '2' })]);
    expect(component.getGridClass()).toBe('grid-cols-2');

    gameEngine.gamesSignal.set([
      createGame(),
      createGame({ id: '2' }),
      createGame({ id: '3' }),
      createGame({ id: '4' }),
      createGame({ id: '5' })
    ]);
    expect(component.getGridClass()).toBe('grid-cols-3');

    gameEngine.gamesSignal.set(
      [
        createGame(),
        createGame({ id: '2' }),
        createGame({ id: '3' }),
        createGame({ id: '4' }),
        createGame({ id: '5' }),
        createGame({ id: '6' }),
        createGame({ id: '7' }),
        createGame({ id: '8' }),
        createGame({ id: '9' }),
        createGame({ id: '10' })
      ]
    );
    expect(component.getGridClass()).toBe('grid-cols-4');
  });
});
