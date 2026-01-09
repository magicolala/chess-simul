import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HydraGameEngineService } from './hydra-game-engine.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChessInstances: any[] = [];

vi.mock('chess.js', () => {
  return {
    Chess: class {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      historyMoves: any[] = [];
      currentTurn: 'w' | 'b' = 'w';
      noLegalMoves = false;

      constructor() {
        mockChessInstances.push(this);
      }

      fen() {
        return `fen-${this.historyMoves.length}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      move({ from, to, promotion }: any) {
        if (this.noLegalMoves) return null;
        const move = { from, to, promotion };
        this.historyMoves.push(move);
        this.currentTurn = this.currentTurn === 'w' ? 'b' : 'w';
        return move;
      }

      history() {
        return this.historyMoves;
      }

      turn() {
        return this.currentTurn;
      }

      moves() {
        return this.noLegalMoves ? [] : [{ from: 'a2', to: 'a3' }];
      }

      isCheckmate() {
        return false;
      }

      isStalemate() {
        return false;
      }

      isDraw() {
        return false;
      }

      isThreefoldRepetition() {
        return false;
      }

      isInsufficientMaterial() {
        return false;
      }

      isFiftyMoves() {
        return false;
      }
    }
  };
});

describe('HydraGameEngineService', () => {
  let service: HydraGameEngineService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    mockChessInstances.length = 0;
    service = new HydraGameEngineService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getGame = (id: string) => (service as any).gamesMap().get(id);

  it('updates countdown every 100ms', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, 'generateGameId').mockReturnValue('game-countdown');
    service.createBotGame(0.1, 0, 'w', 'easy');

    const initialWhiteTime = getGame('game-countdown').timeRemaining.white;

    vi.advanceTimersByTime(100);

    expect(getGame('game-countdown').timeRemaining.white).toBe(initialWhiteTime - 100);
  });

  it('applies increment after a player move', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, 'generateGameId').mockReturnValue('game-increment');
    service.createBotGame(0.1, 2, 'w', 'easy');

    const beforeMove = getGame('game-increment').timeRemaining.white;

    const moveResult = service.makeMove('game-increment', 'e2', 'e4');

    expect(moveResult).toBe(true);
    expect(getGame('game-increment').timeRemaining.white).toBe(beforeMove + 2000);
  });

  it('marks game as timeout when clock runs out', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, 'generateGameId').mockReturnValue('game-timeout');
    service.createBotGame(0.001, 0, 'w', 'easy');

    vi.setSystemTime(100);
    vi.advanceTimersByTime(100);

    expect(getGame('game-timeout').status).toBe('timeout');
    expect(getGame('game-timeout').timeRemaining.white).toBe(0);
  });

  it('forfeits games after inactivity at low ply counts', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, 'generateGameId').mockReturnValue('game-inactivity');
    service.createBotGame(1, 0, 'w', 'easy');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).gamesMap.update((map: Map<string, any>) => {
      const game = map.get('game-inactivity');
      if (game) {
        map.set('game-inactivity', { ...game, lastActivityTime: 0 });
      }
      return new Map(map);
    });

    vi.setSystemTime(21000);
    vi.advanceTimersByTime(100);

    expect(getGame('game-inactivity').status).toBe('timeout');
  });

  it('enqueues a bot move when it becomes the bot turn', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service as any, 'generateGameId').mockReturnValue('game-bot');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const botMoveSpy = vi.spyOn(service as any, 'makeBotMove');
    vi.spyOn(Math, 'random').mockReturnValue(0);

    service.createBotGame(1, 0, 'w', 'easy');

    const moveResult = service.makeMove('game-bot', 'a2', 'a3');

    expect(moveResult).toBe(true);
    expect(getGame('game-bot').opponentJustMoved).toBe(true);
    expect(botMoveSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(botMoveSpy).toHaveBeenCalledWith('game-bot');
  });

  it('removes games cleanly without altering other ids', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idSpy = vi.spyOn(service as any, 'generateGameId');
    idSpy.mockReturnValueOnce('game-one');
    idSpy.mockReturnValueOnce('game-two');

    service.createBotGame(1, 0, 'w', 'easy');
    service.createBotGame(1, 0, 'w', 'easy');

    service.removeGame('game-one');

    expect(getGame('game-one')).toBeUndefined();
    expect(getGame('game-two')?.id).toBe('game-two');
    expect(service.games().map((g) => g.id)).toEqual(['game-two']);
  });
});
