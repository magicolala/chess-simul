/**
 * Recover chess.js move history for threefold-repetition detection (#55).
 *
 * A FEN contains the current position but not the sequence of previous
 * positions. Only replay a complete, sequential game that started from the
 * standard initial position AND reproduces the stored current FEN.
 *
 * Older games have no saved move rows. For those (or custom starting
 * positions), fall back to FEN-only validation without inventing repetition.
 */
export type StoredChessMove = { ply: number; uci: string };

export type ReplayableChess = {
  fen(): string;
  move(input: { from: string; to: string; promotion?: string }): unknown;
};

export function recoverVerifiedHistory<T extends ReplayableChess>(
  currentFen: string,
  currentPly: number,
  previousMoves: StoredChessMove[],
  fromStart: () => T,
  fromFen: (fen: string) => T
): { chess: T; complete: boolean } {
  const fallback = (): { chess: T; complete: boolean } => ({
    chess: fromFen(currentFen),
    complete: false
  });

  if (!Number.isInteger(currentPly) || currentPly < 0) return fallback();
  if (currentPly === 0) return fallback();
  if (previousMoves.length !== currentPly) return fallback();

  try {
    const chess = fromStart();
    for (let i = 0; i < previousMoves.length; i++) {
      const row = previousMoves[i];
      if (
        row.ply !== i + 1 ||
        typeof row.uci !== 'string' ||
        !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(row.uci)
      ) {
        return fallback();
      }
      const played = chess.move({
        from: row.uci.slice(0, 2),
        to: row.uci.slice(2, 4),
        promotion: row.uci.length === 5 ? row.uci[4] : undefined
      });
      if (!played) return fallback();
    }

    // Do not assume a custom FEN was a standard-start game.
    if (chess.fen() !== currentFen) return fallback();
    return { chess, complete: true };
  } catch {
    return fallback();
  }
}
