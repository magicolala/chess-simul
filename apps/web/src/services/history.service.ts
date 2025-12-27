
import { Injectable, signal, effect } from '@angular/core';

export interface GameResult {
  id: string;
  opponentName: string;
  opponentRating: number;
  opponentAvatar: string;
  result: 'win' | 'loss' | 'draw'; // from player perspective
  date: number;
  fen: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  history = signal<GameResult[]>([]);

  constructor() {
    const stored = localStorage.getItem('simul_history');
    if (stored) {
      this.history.set(JSON.parse(stored));
    }

    effect(() => {
      localStorage.setItem('simul_history', JSON.stringify(this.history()));
    });
  }

  addResult(result: GameResult) {
    this.history.update(h => [result, ...h]);
  }

  clearHistory() {
    this.history.set([]);
  }

  getStats() {
    const games = this.history();
    const total = games.length;
    if (total === 0) return { wins: 0, losses: 0, draws: 0, winRate: 0 };

    const wins = games.filter(g => g.result === 'win').length;
    const losses = games.filter(g => g.result === 'loss').length;
    const draws = games.filter(g => g.result === 'draw').length;

    return {
      wins,
      losses,
      draws,
      winRate: Math.round((wins / total) * 100)
    };
  }
}
