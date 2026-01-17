import { Injectable } from '@angular/core';
import { Chess } from 'chess.js';

export interface AnalysisNode {
  fen: string;
  moveSan: string; // e.g. "e4"
  moveUci: string; // e.g. "e2e4"
  moveNumber: number;
  turn: 'w' | 'b';
  comment?: string;
  eval?: number; // Centipawns (positive = white advantage)
  mate?: number; // Moves to mate
  bestMove?: string; // Uci
  classification?: 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  // Fake Stockfish analysis
  analyzePosition(fen: string): Promise<Partial<AnalysisNode>> {
    return new Promise((resolve) => {
      // Simulation delay
      setTimeout(() => {
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });

        if (chess.isGameOver()) {
          resolve({ eval: 0, bestMove: undefined });
          return;
        }

        // Mock Evaluation Logic
        // We use a simple material count + random noise to simulate eval
        let score = 0;
        const board = chess.board();
        for (const row of board) {
          for (const piece of row) {
            if (!piece) {
              continue;
            }
            const val =
              piece.type === 'p'
                ? 1
                : piece.type === 'n'
                  ? 3
                  : piece.type === 'b'
                    ? 3
                    : piece.type === 'r'
                      ? 5
                      : piece.type === 'q'
                        ? 9
                        : 0;
            score += piece.color === 'w' ? val : -val;
          }
        }

        // Add random positional noise (-0.5 to +0.5)
        const noise = Math.random() - 0.5;
        const finalEval = (score + noise) * 100; // to centipawns

        // Pick a random "Best Move"
        const bestMove = moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;

        // Determine classification based on randomness for demo
        const rand = Math.random();
        let cls: AnalysisNode['classification'] = 'good';
        if (rand > 0.95) {
          cls = 'brilliant';
        } else if (rand > 0.8) {
          cls = 'best';
        } else if (rand < 0.1) {
          cls = 'blunder';
        } else if (rand < 0.2) {
          cls = 'mistake';
        }

        resolve({
          eval: Math.round(finalEval),
          bestMove: bestMove ? bestMove.from + bestMove.to : undefined,
          classification: cls
        });
      }, 300); // 300ms thinking time
    });
  }

  getPgnFromHistory(moves: string[]): string {
    const c = new Chess();
    moves.forEach((m) => c.move(m));
    return c.pgn();
  }
}
