import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  recoverVerifiedHistory,
  type StoredChessMove
} from '../../../../supabase/functions/_shared/chess-history';

const moves = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1'];

function position(movesUci: string[]) {
  const chess = new Chess();
  for (const uci of movesUci) {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
  }
  return chess;
}

const recover = (fen: string, ply: number, rows: StoredChessMove[]) =>
  recoverVerifiedHistory(fen, ply, rows, () => new Chess(), (value) => new Chess(value));

describe('verified move-history recovery (#55)', () => {
  it('detects threefold repetition only after replaying complete history', () => {
    const fen = position(moves).fen();
    const rows = moves.map((uci, i) => ({ ply: i + 1, uci }));
    const { chess, complete } = recover(fen, 7, rows);

    expect(complete).toBe(true);
    expect(chess.isThreefoldRepetition()).toBe(false);
    chess.move({ from: 'f6', to: 'g8' });

    expect(chess.isThreefoldRepetition()).toBe(true);
    expect(chess.isDraw()).toBe(true);
  });

  it('falls back to stored FEN if legacy moves are missing', () => {
    const fen = position(moves).fen();
    const { chess, complete } = recover(fen, 7, []);
    expect(complete).toBe(false);
    expect(chess.fen()).toBe(fen);
  });

  it('never replays truncated, out-of-order or invalid history', () => {
    const fen = position(moves).fen();
    const rows = moves.map((uci, i) => ({ ply: i + 1, uci }));
    expect(recover(fen, 7, rows.slice(1)).complete).toBe(false);
    expect(recover(fen, 7, rows.map((row) => (
      row.ply === 2 ? { ...row, ply: 4 } : row
    ))).complete).toBe(false);
    expect(recover(fen, 7, rows.map((row) => (
      row.ply === 4 ? { ...row, uci: 'not-a-move' } : row
    ))).complete).toBe(false);
  });

  it('does not interpret a custom starting position as standard chess history', () => {
    const game = new Chess('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
    const { chess, complete } = recover(game.fen(), 1, [{ ply: 1, uci: 'e2e4' }]);
    expect(complete).toBe(false);
    expect(chess.fen()).toBe(game.fen());
  });
});
