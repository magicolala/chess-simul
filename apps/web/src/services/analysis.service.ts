import { Injectable } from '@angular/core';
import { Chess, type Piece } from 'chess.js';

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

        const score = this.evaluateBoard(chess.board());

        // Add random positional noise (-0.5 to +0.5)
        const noise = Math.random() - 0.5;
        const finalEval = (score + noise) * 100; // to centipawns

        // Pick a random "Best Move"
        const bestMove = moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;

        const cls = this.classifyMove();

        resolve({
          eval: Math.round(finalEval),
          bestMove: bestMove ? bestMove.from + bestMove.to : undefined,
          classification: cls
        });
      }, 300); // 300ms thinking time
    });
  }

  private evaluateBoard(board: (Piece | null)[][]): number {
    let score = 0;
    for (const row of board) {
      for (const piece of row) {
        if (!piece) {
          continue;
        }
        const val = this.getPieceValue(piece.type);
        score += piece.color === 'w' ? val : -val;
      }
    }
    return score;
  }

  private getPieceValue(type: Piece['type']): number {
    switch (type) {
      case 'p': return 1;
      case 'n': return 3;
      case 'b': return 3;
      case 'r': return 5;
      case 'q': return 9;
      default: return 0;
    }
  }

  private classifyMove(): AnalysisNode['classification'] {
    const rand = Math.random();
    if (rand > 0.95) { return 'brilliant'; }
    if (rand > 0.8) { return 'best'; }
    if (rand < 0.1) { return 'blunder'; }
    if (rand < 0.2) { return 'mistake'; }
    return 'good';
  }

  getPgnFromHistory(moves: string[]): string {
    const c = new Chess();
    moves.forEach((m) => c.move(m));
    return c.pgn();
  }
}
