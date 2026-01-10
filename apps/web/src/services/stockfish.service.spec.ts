import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { StockfishService, type StockfishBestMove } from './stockfish.service';

describe('StockfishService', () => {
  let service: StockfishService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StockfishService]
    });
    service = TestBed.inject(StockfishService);
  });

  afterEach(() => {
    service.terminate();
  });

  describe('Initialization', () => {
    it('should create service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize worker successfully', async () => {
      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('should reuse existing promise on multiple initialize calls', async () => {
      const promise1 = service.initialize();
      const promise2 = service.initialize();
      
      // Both should resolve successfully
      await expect(promise1).resolves.toBeUndefined();
      await expect(promise2).resolves.toBeUndefined();
    });

    it('should throw error when Worker is not supported', async () => {
      // Save original Worker
      const originalWorker = global.Worker;
      
      // Remove Worker temporarily
      // @ts-ignore
      global.Worker = undefined;

      const newService = new StockfishService();
      
      await expect(newService.initialize()).rejects.toThrow(
        'Web Workers are not supported in this environment.'
      );

      // Restore Worker
      global.Worker = originalWorker;
    });

    it('should allow reset and retry after failure', async () => {
      // Save original Worker
      const originalWorker = global.Worker;
      
      // Remove Worker to cause failure
      // @ts-ignore
      global.Worker = undefined;

      const newService = new StockfishService();
      
      // First attempt should fail
      await expect(newService.initialize()).rejects.toThrow();

      // Restore Worker
      global.Worker = originalWorker;

      // Reset the service
      newService.reset();

      // Second attempt should succeed
      await expect(newService.initialize()).resolves.toBeUndefined();
      
      newService.terminate();
    });

    it('should not allow initialization after previous failure without reset', async () => {
      // Save original Worker
      const originalWorker = global.Worker;
      
      // Remove Worker to cause failure
      // @ts-ignore
      global.Worker = undefined;

      const newService = new StockfishService();
      
      // First attempt should fail
      await expect(newService.initialize()).rejects.toThrow();

      // Restore Worker
      global.Worker = originalWorker;

      // Second attempt without reset should still fail
      await expect(newService.initialize()).rejects.toThrow();
      
      newService.terminate();
    });
  });

  describe('Best Move Calculation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get best move for starting position', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const bestMove = await service.getBestMove(fen);

      expect(bestMove).toBeTruthy();
      expect(bestMove).toHaveProperty('from');
      expect(bestMove).toHaveProperty('to');
      expect(bestMove?.from).toHaveLength(2);
      expect(bestMove?.to).toHaveLength(2);
    });

    it('should parse bestmove response correctly', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const bestMove = await service.getBestMove(fen);

      // MockWorker returns e2e4
      expect(bestMove).toEqual({ from: 'e2', to: 'e4' });
    });

    it('should handle different depth values', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      const move1 = await service.getBestMove(fen, 5);
      expect(move1).toBeTruthy();

      const move2 = await service.getBestMove(fen, 15);
      expect(move2).toBeTruthy();
    });

    it('should cancel previous request when new one starts', async () => {
      const fen1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

      // Start first request
      const promise1 = service.getBestMove(fen1);
      
      // Start second request immediately (should cancel first)
      const promise2 = service.getBestMove(fen2);

      const result1 = await promise1;
      const result2 = await promise2;

      // First should be cancelled (return null)
      expect(result1).toBeNull();
      
      // Second should succeed
      expect(result2).toBeTruthy();
    });

    it('should initialize automatically when getBestMove is called', async () => {
      const newService = new StockfishService();
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      // getBestMove calls initialize internally, so it should work
      const move = await newService.getBestMove(fen);
      expect(move).toBeTruthy();
      
      newService.terminate();
    });
  });

  describe('Worker Lifecycle', () => {
    it('should terminate worker correctly', async () => {
      await service.initialize();
      
      // Should not throw
      expect(() => service.terminate()).not.toThrow();
    });

    it('should allow reinitialization after terminate', async () => {
      await service.initialize();
      service.terminate();
      
      // Should be able to initialize again
      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('should handle terminate on uninitialized service', () => {
      const newService = new StockfishService();
      
      // Should not throw
      expect(() => newService.terminate()).not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    it('should clear init error on reset', async () => {
      // Save original Worker
      const originalWorker = global.Worker;
      
      // Remove Worker to cause failure
      // @ts-ignore
      global.Worker = undefined;

      const newService = new StockfishService();
      
      // Cause failure
      await expect(newService.initialize()).rejects.toThrow();

      // Restore Worker
      global.Worker = originalWorker;

      // Reset
      newService.reset();

      // Should now succeed
      await expect(newService.initialize()).resolves.toBeUndefined();
      
      newService.terminate();
    });

    it('should terminate worker on reset', async () => {
      await service.initialize();
      
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      await service.getBestMove(fen);

      service.reset();

      // After reset, should need to reinitialize
      await expect(service.initialize()).resolves.toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle complex FEN positions', async () => {
      await service.initialize();
      
      // Middle game position
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const bestMove = await service.getBestMove(fen);
      
      expect(bestMove).toBeTruthy();
    });

    it('should handle endgame positions', async () => {
      await service.initialize();
      
      // King and pawn endgame
      const fen = '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1';
      const bestMove = await service.getBestMove(fen);
      
      expect(bestMove).toBeTruthy();
    });
  });
});
