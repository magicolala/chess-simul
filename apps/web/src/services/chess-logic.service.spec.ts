import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { ChessSimulService, type GameConfig } from './chess-logic.service';
import { HistoryService } from './history.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

const createAuthMock = (elo: number = 1200) => ({
    currentUser: vi.fn(() => ({
        id: 'user-1',
        email: 'test@example.com',
        name: 'TestUser',
        avatar: 'avatar.png',
        elo,
        isPremium: false,
        emailVerified: true,
        onboardingCompleted: true,
        isAnonymous: false
    })),
    updateElo: vi.fn()
});

const createHistoryMock = () => ({
    addResult: vi.fn(),
    history: vi.fn(() => []),
    getStats: vi.fn(() => ({ wins: 0, losses: 0, draws: 0, winRate: 0 })),
    getHydraStats: vi.fn(() => ({ totalPoints: 0, wins: 0, draws: 0, losses: 0 }))
});

const createApiMock = () => ({
    recordGame: vi.fn(async () => { })
});

describe('ChessSimulService', () => {
    let service: ChessSimulService;
    let authMock: ReturnType<typeof createAuthMock>;
    let historyMock: ReturnType<typeof createHistoryMock>;
    let apiMock: ReturnType<typeof createApiMock>;

    beforeEach(() => {
        authMock = createAuthMock();
        historyMock = createHistoryMock();
        apiMock = createApiMock();

        TestBed.configureTestingModule({
            providers: [
                ChessSimulService,
                { provide: AuthService, useValue: authMock },
                { provide: HistoryService, useValue: historyMock },
                { provide: ApiService, useValue: apiMock }
            ]
        });

        service = TestBed.inject(ChessSimulService);
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    describe('Game Creation', () => {
        it('should create a PvP session with correct configuration', () => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 5,
                opponentCount: 1,
                difficulty: 'pvp'
            };

            service.startPvpSession(config);

            const games = service.games();
            expect(games).toHaveLength(1);
            expect(games[0].mode).toBe('local');
            expect(games[0].status).toBe('active');
            expect(games[0].whiteTime).toBe(10 * 60 * 1000);
            expect(games[0].blackTime).toBe(10 * 60 * 1000);
        });

        it('should create multiple games for simul hosting', () => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 3,
                difficulty: 'pvp'
            };

            service.startSimulHosting(config);

            const games = service.games();
            expect(games).toHaveLength(3);
            expect(games.every((g) => g.mode === 'simul-host')).toBe(true);
        });

        it('should initialize game with starting position', () => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };

            service.startPvpSession(config);

            const game = service.games()[0];
            expect(game.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(game.history).toEqual([]);
            expect(game.lastMove).toBeNull();
        });
    });

    describe.skip('Move Execution', () => {
        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 5,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);
        });

        it('should execute a valid move', () => {
            const gameId = service.games()[0].id;

            service.makeMove(gameId, 'e2', 'e4');

            const game = service.games()[0];
            // console.log('Game history:', game.history);
            expect(game.history).toHaveLength(1);
            expect(game.lastMove).toEqual({ from: 'e2', to: 'e4' });
        });

        it('should reject invalid moves', () => {
            const gameId = service.games()[0].id;

            service.makeMove(gameId, 'e2', 'e5'); // Invalid move

            const game = service.games()[0];
            expect(game.history).toHaveLength(0);
            expect(game.lastMove).toBeNull();
        });

        it('should update FEN after move', () => {
            const gameId = service.games()[0].id;
            const initialFen = service.games()[0].fen;

            service.makeMove(gameId, 'e2', 'e4');
            const game = service.games()[0];
            expect(game.fen).not.toBe(initialFen);
            expect(game.fen).toContain('b KQkq e3'); // En passant square, black to move
        });

        it('should store move in history', () => {
            const gameId = service.games()[0].id;

            service.makeMove(gameId, 'e2', 'e4');
            service.makeMove(gameId, 'e7', 'e5');

            const game = service.games()[0];
            expect(game.history).toEqual(['e4', 'e5']);
            expect(game.fenHistory).toHaveLength(2);
        });
    });

    describe('Game Status Detection', () => {
        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);
        });

        it('should detect checkmate (Fool\'s Mate)', () => {
            const gameId = service.games()[0].id;

            // Fool's Mate sequence
            service.makeMove(gameId, 'f2', 'f3');
            service.makeMove(gameId, 'e7', 'e5');
            service.makeMove(gameId, 'g2', 'g4');
            service.makeMove(gameId, 'd8', 'h4'); // Checkmate

            const game = service.games()[0];
            expect(game.status).toBe('checkmate');
            // winner is not a property on GameState, check system message or calculate from turn
            expect(game.systemMessage).toContain('Les Noirs gagnent');
        });

        it('should detect stalemate', () => {
            const gameId = service.games()[0].id;
            const game = service.games()[0];

            // Set up a position one move before stalemate
            // White King on a1, Black King on h8
            // White Queen on f7. White to move.
            // Move Qf7-g6 delivers stalemate.
            game.chess.load('7k/5Q2/8/8/8/8/8/K7 w - - 0 1');
            game.fen = game.chess.fen();
            game.turn = 'w';

            service.makeMove(gameId, 'f7', 'g6'); // This should cause stalemate

            expect(game.status).toBe('stalemate');
        });
    });

    describe.skip('Timer Management', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    ChessSimulService,
                    { provide: AuthService, useValue: authMock },
                    { provide: HistoryService, useValue: historyMock },
                    { provide: ApiService, useValue: apiMock }
                ]
            });
            service = TestBed.inject(ChessSimulService);
        });

        afterEach(() => {
            service.ngOnDestroy();
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        it('should decrement time for active player', () => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);

            const gameId = service.games()[0].id;
            const initialWhiteTime = service.games()[0].whiteTime;

            // Make a move to start white's timer
            service.makeMove(gameId, 'e2', 'e4');

            // Advance time by 1 second
            vi.advanceTimersByTime(1000);

            const game = service.games()[0];
            expect(game.blackTime).toBeLessThan(initialWhiteTime);
        });

        it('should add increment after move', () => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 3,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);

            const gameId = service.games()[0].id;
            service.makeMove(gameId, 'e2', 'e4');

            const initialBlackTime = service.games()[0].blackTime;

            // Advance time slightly
            vi.advanceTimersByTime(100);

            service.makeMove(gameId, 'e7', 'e5');

            const game = service.games()[0];
            // Black should have gained increment (3 seconds = 3000ms)
            expect(game.blackTime).toBeGreaterThan(initialBlackTime - 100);
        });

        it('should detect timeout', () => {
            const config: GameConfig = {
                timeMinutes: 0.001, // Very short time
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);

            const gameId = service.games()[0].id;
            service.makeMove(gameId, 'e2', 'e4');

            // Advance time past the time limit
            vi.advanceTimersByTime(100);

            const game = service.games()[0];
            expect(game.status).toBe('timeout');
        });
    });

    describe('Resignation and Draw Offers', () => {
        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);
        });

        it('should handle resignation', () => {
            const gameId = service.games()[0].id;

            service.resign(gameId);

            const game = service.games()[0];
            expect(game.status).toBe('resigned');
        });

        it('should offer draw', () => {
            const gameId = service.games()[0].id;

            service.offerDraw(gameId);

            const game = service.games()[0];
            expect(game.systemMessage).toContain('Nulle proposée');
        });
    });

    describe('History Navigation', () => {
        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);

            const gameId = service.games()[0].id;
            // Make some moves
            service.makeMove(gameId, 'e2', 'e4');
            service.makeMove(gameId, 'e7', 'e5');
            service.makeMove(gameId, 'd2', 'd4');
        });

        it('should navigate to start of game', () => {
            const gameId = service.games()[0].id;

            service.navigateHistory(gameId, 'start');

            const game = service.games()[0];
            expect(game.viewIndex).toBe(0);
        });

        it('should navigate to previous move', () => {
            const gameId = service.games()[0].id;

            service.navigateHistory(gameId, 'prev');

            const game = service.games()[0];
            expect(game.viewIndex).toBe(1);
        });

        it('should navigate to next move', () => {
            const gameId = service.games()[0].id;

            service.navigateHistory(gameId, 'start');
            service.navigateHistory(gameId, 'next');

            const game = service.games()[0];
            expect(game.viewIndex).toBe(1);
        });

        it('should navigate to end of game', () => {
            const gameId = service.games()[0].id;

            service.navigateHistory(gameId, 'start');
            service.navigateHistory(gameId, 'end');

            const game = service.games()[0];
            expect(game.viewIndex).toBe(-1);
        });
    });

    describe('ELO Calculation', () => {
        it('should calculate correct ELO delta for win', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delta = (service as any).calculateEloDelta('win', 1200, 1200);

            expect(delta).toBeGreaterThan(0);
            expect(delta).toBeLessThanOrEqual(32); // Max K-factor
        });

        it('should calculate correct ELO delta for loss', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delta = (service as any).calculateEloDelta('loss', 1200, 1200);

            expect(delta).toBeLessThan(0);
            expect(delta).toBeGreaterThanOrEqual(-32);
        });

        it('should calculate correct ELO delta for draw', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delta = (service as any).calculateEloDelta('draw', 1200, 1200);

            expect(Math.abs(delta)).toBeLessThan(1); // Should be close to 0
        });

        it('should give more points for beating higher-rated opponent', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const deltaVsLower = (service as any).calculateEloDelta('win', 1200, 1000);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const deltaVsHigher = (service as any).calculateEloDelta('win', 1200, 1400);

            expect(deltaVsHigher).toBeGreaterThan(deltaVsLower);
        });
    });

    describe('Game Recording', () => {
        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 10,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.startPvpSession(config);
        });

        it('should record game to history on completion', () => {
            const gameId = service.games()[0].id;

            service.resign(gameId);

            expect(historyMock.addResult).toHaveBeenCalled();
        });

        it('should update user ELO after game', () => {
            const gameId = service.games()[0].id;

            service.resign(gameId);

            expect(authMock.updateElo).toHaveBeenCalled();
        });
    });
});
