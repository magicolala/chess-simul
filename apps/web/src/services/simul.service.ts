import { Injectable, signal, inject } from '@angular/core';
import { GameConfig } from './chess-logic.service';
import { AuthService } from './auth.service';

export interface SimulEvent {
  id: string;
  host: {
    name: string;
    avatar: string;
    elo: number;
  };
  config: GameConfig;
  status: 'open' | 'started' | 'finished';
  challengers: {
    id: string;
    name: string;
    avatar: string;
    elo: number;
    status: 'ready' | 'waiting';
  }[];
  maxPlayers: number;
  createdAt: number;
  isPrivate: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SimulService {
  private auth = inject(AuthService);

  // Global list of simuls
  simuls = signal<SimulEvent[]>([]);

  // Current active simul context
  currentSimul = signal<SimulEvent | null>(null);

  constructor() {
    // Mock Data
    this.simuls.set([
      this.createMockSimul('GrandMaster_X', 2800, 20, 10, 'open', 15),
      this.createMockSimul('StreamerPro', 1600, 10, 0, 'open', 8),
      this.createMockSimul('ChessAcademy', 2100, 30, 0, 'started', 20)
    ]);
  }

  createSimul(config: GameConfig, isPrivate: boolean): string {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Must be logged in');

    const newSimul: SimulEvent = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      host: {
        name: user.name,
        avatar: user.avatar,
        elo: 1200 // Mock
      },
      config,
      status: 'open',
      challengers: [],
      maxPlayers: config.opponentCount,
      createdAt: Date.now(),
      isPrivate
    };

    this.currentSimul.set(newSimul);
    if (!isPrivate) {
      this.simuls.update((list) => [newSimul, ...list]);
    }
    return newSimul.id;
  }

  joinSimul(simulId: string) {
    const user = this.auth.currentUser();
    if (!user) return;

    // Find in list or use current if we are just looking at it
    const simul = this.simuls().find((s) => s.id === simulId) || this.currentSimul();

    if (!simul) throw new Error('Simultanée introuvable');
    if (simul.status !== 'open') throw new Error('Cette simultanée a déjà commencé');

    // Check if already joined
    if (simul.challengers.some((c) => c.name === user.name)) {
      this.currentSimul.set(simul);
      return;
    }

    const updatedSimul = { ...simul };
    updatedSimul.challengers = [
      ...updatedSimul.challengers,
      {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        elo: 1200,
        status: 'ready'
      }
    ];

    this.currentSimul.set(updatedSimul);

    // Update global list
    this.simuls.update((list) => list.map((s) => (s.id === simulId ? updatedSimul : s)));
  }

  startSimul() {
    const simul = this.currentSimul();
    if (simul) {
      const started = { ...simul, status: 'started' as const };
      this.currentSimul.set(started);
      this.simuls.update((list) => list.map((s) => (s.id === simul.id ? started : s)));
    }
  }

  leaveSimul() {
    this.currentSimul.set(null);
  }

  private createMockSimul(
    hostName: string,
    elo: number,
    time: number,
    inc: number,
    status: 'open' | 'started',
    max: number
  ): SimulEvent {
    return {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      host: {
        name: hostName,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${hostName}`,
        elo
      },
      config: { timeMinutes: time, incrementSeconds: inc, opponentCount: max, difficulty: 'pvp' },
      status,
      challengers: Array(Math.floor(Math.random() * max))
        .fill(null)
        .map((_, i) => ({
          id: `p${i}`,
          name: `Challenger_${i}`,
          avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=p${i}`,
          elo: 1000 + Math.floor(Math.random() * 500),
          status: 'ready'
        })),
      maxPlayers: max,
      createdAt: Date.now(),
      isPrivate: false
    };
  }
}
