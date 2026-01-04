import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HistoryService, type GameResult } from './history.service';
import { SupabaseClientService } from './supabase-client.service';

const createSupabaseStub = () => {
  const fakeChannel = {
    on: () => fakeChannel,
    subscribe: () => fakeChannel
  } as any;

  return {
    currentUser: () => null,
    client: {
      from: () => ({
        select: () => ({
          or: () => ({
            in: async () => ({ data: [], error: null })
          })
        })
      }),
      removeChannel: async () => {},
      channel: () => fakeChannel
    }
  } as unknown as SupabaseClientService;
};

const createResult = (overrides: Partial<GameResult> = {}): GameResult => ({
  id: '1',
  opponentName: 'Opponent',
  opponentRating: 1500,
  opponentAvatar: 'avatar.svg',
  result: 'win',
  date: 1700000000000,
  fen: 'start',
  hydraPoints: 3,
  ...overrides
});

describe('HistoryService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HistoryService, { provide: SupabaseClientService, useFactory: createSupabaseStub }]
    });
    localStorage.clear();
  });

  it('restores saved history from localStorage', () => {
    const stored = [createResult({ id: 'saved', hydraPoints: 2 })];
    localStorage.setItem('simul_history', JSON.stringify(stored));

    const service = TestBed.inject(HistoryService);

    TestBed.flushEffects();

    expect(service.history()).toHaveLength(1);
    expect(service.history()[0]).toMatchObject({ id: 'saved', hydraPoints: 2 });
  });

  it('adds new results to the front of the history list', () => {
    const service = TestBed.inject(HistoryService);
    const first = createResult({ id: 'first', result: 'win' });
    const second = createResult({ id: 'second', result: 'loss' });

    service.addResult(first);
    service.addResult(second);

    TestBed.flushEffects();

    expect(service.history().map((r) => r.id)).toEqual(['second', 'first']);
    const storedHistory = JSON.parse(localStorage.getItem('simul_history') ?? '[]');
    expect(storedHistory[0].id).toBe('second');
  });

  it('computes stats with correct win rate', () => {
    const service = TestBed.inject(HistoryService);
    service.addResult(createResult({ result: 'win' }));
    service.addResult(createResult({ result: 'loss' }));
    service.addResult(createResult({ result: 'draw' }));

    expect(service.getStats()).toEqual({ wins: 1, losses: 1, draws: 1, winRate: 33 });
    TestBed.flushEffects();

    expect(service.getHydraStats()).toEqual({ totalPoints: 9, wins: 1, draws: 1, losses: 1 });
  });
});
