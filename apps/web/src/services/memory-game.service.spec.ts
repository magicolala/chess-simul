import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { MemoryGameService } from './memory-game.service';

/**
 * Playwright used to fail intermittently after "Jouer en Solo" because
 * a randomly selected historic PGN contained an illegal move.
 * Explicitly test EVERY embedded game, not one nondeterministic draw.
 */
describe('MemoryGameService historic PGNs (#68)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const games = [
    'immortal',
    'opera',
    'kasparov-topalov',
    'fischer-byrne'
  ] as const;

  for (const [index, gameId] of games.entries()) {
    it(`loads the complete ${gameId} PGN and starts a solo board`, () => {
      const service = new MemoryGameService();
      vi.spyOn(Math, 'random').mockReturnValue((index + 0.5) / games.length);

      expect(() => service.startGame('solo')).not.toThrow();

      const state = service.state();
      expect(state.currentGame?.id).toBe(gameId);
      expect(state.status).toBe('memorizing');
      expect(state.currentMoveIndex).toBe(0);
      expect(state.chess.fen()).toBe(new Chess().fen());
      expect(state.targetChess.history().length).toBeGreaterThanOrEqual(20);
    });
  }
});
