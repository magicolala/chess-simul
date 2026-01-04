import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, type User } from './auth.service';
import { SimulService, type SimulEvent } from './simul.service';

const baseUser: User = {
  id: 'user-1',
  email: 'player@example.com',
  name: 'PlayerOne',
  avatar: 'avatar.png',
  isPremium: false,
  emailVerified: true,
  onboardingCompleted: true,
  elo: 1500
};

const buildSimul = (overrides: Partial<SimulEvent> = {}): SimulEvent => ({
  id: 'SIMUL123',
  host: {
    name: 'Host',
    avatar: 'avatar-host',
    elo: 2200,
    ...overrides.host
  },
  config: {
    timeMinutes: 5,
    incrementSeconds: 0,
    opponentCount: 3,
    difficulty: 'pvp'
  },
  status: 'open',
  challengers: [],
  maxPlayers: 3,
  createdAt: 1000,
  isPrivate: false,
  ...overrides
});

describe('SimulService', () => {
  let service: SimulService;
  let authMock: { currentUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authMock = {
      currentUser: vi.fn(() => ({ ...baseUser }))
    };

    TestBed.configureTestingModule({
      providers: [SimulService, { provide: AuthService, useValue: authMock }]
    });

    service = TestBed.inject(SimulService);
    service.simuls.set([]);
    service.currentSimul.set(null);
  });

  it('creates a public simul and adds it to the list', () => {
    const id = service.createSimul(
      { timeMinutes: 10, incrementSeconds: 5, opponentCount: 2, difficulty: 'pvp' },
      false
    );

    const simuls = service.simuls();
    expect(simuls).toHaveLength(1);
    expect(simuls[0].id).toBe(id);
    expect(simuls[0].isPrivate).toBe(false);
    expect(service.currentSimul()?.id).toBe(id);
  });

  it('creates a private simul without adding it to the public list', () => {
    const id = service.createSimul(
      { timeMinutes: 10, incrementSeconds: 5, opponentCount: 2, difficulty: 'pvp' },
      true
    );

    expect(service.simuls()).toHaveLength(0);
    expect(service.currentSimul()?.id).toBe(id);
    expect(service.currentSimul()?.isPrivate).toBe(true);
  });

  it('throws when creating a simul while unauthenticated', () => {
    authMock.currentUser.mockReturnValue(null);

    expect(() =>
      service.createSimul(
        { timeMinutes: 5, incrementSeconds: 0, opponentCount: 1, difficulty: 'pvp' },
        false
      )
    ).toThrowError('Must be logged in');
    expect(service.simuls()).toHaveLength(0);
    expect(service.currentSimul()).toBeNull();
  });

  it('throws when joining while unauthenticated', () => {
    authMock.currentUser.mockReturnValue(null);

    expect(() => service.joinSimul('SIMUL123')).toThrowError('Must be logged in');
    expect(service.currentSimul()).toBeNull();
  });

  it('throws when the simul ID is unknown', () => {
    service.simuls.set([]);

    expect(() => service.joinSimul('missing')).toThrowError('Simultanée introuvable');
    expect(service.currentSimul()).toBeNull();
  });

  it('throws when trying to join a simul that has already started', () => {
    const simul = buildSimul({ id: 'SIMUL999', status: 'started' });
    service.simuls.set([simul]);

    expect(() => service.joinSimul(simul.id)).toThrowError('Cette simultanée a déjà commencé');
    expect(service.currentSimul()).toBeNull();
  });

  it('adds the challenger when joining an open simul', () => {
    const simul = buildSimul({ id: 'SIMULJOIN' });
    service.simuls.set([simul]);

    service.joinSimul(simul.id);

    const current = service.currentSimul();
    expect(current?.challengers).toHaveLength(1);
    expect(current?.challengers[0].id).toBe(baseUser.id);
    expect(service.simuls()[0].challengers).toHaveLength(1);
  });

  it('does not duplicate challengers when the user already joined', () => {
    const simul = buildSimul({
      id: 'SIMULDUP',
      challengers: [
        {
          id: baseUser.id,
          name: baseUser.name,
          avatar: baseUser.avatar,
          elo: baseUser.elo,
          status: 'ready'
        }
      ]
    });
    service.simuls.set([simul]);

    service.joinSimul(simul.id);

    expect(service.simuls()[0].challengers).toHaveLength(1);
    expect(service.currentSimul()).toEqual(simul);
  });

  it('updates status when starting the current simul', () => {
    const simul = buildSimul({ id: 'SIMULSTART' });
    service.simuls.set([simul]);
    service.currentSimul.set(simul);

    service.startSimul();

    expect(service.currentSimul()?.status).toBe('started');
    expect(service.simuls()[0].status).toBe('started');
  });

  it('clears the current simul when leaving', () => {
    const simul = buildSimul({ id: 'SIMULLEAVE' });
    service.currentSimul.set(simul);

    service.leaveSimul();

    expect(service.currentSimul()).toBeNull();
  });
});
