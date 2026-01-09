import { Injectable, signal, computed } from '@angular/core';
import { Chess } from 'chess.js';
import { Observable, interval, map, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface HydraGame {
  id: string;
  chess: Chess;
  fen: string;
  lastMove: { from: string; to: string } | null;
  plyCount: number;
  status: 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';
  timeRemaining: { white: number; black: number }; // milliseconds
  increment: number; // seconds
  startTime: number;
  lastMoveTime: number;
  playerColor: 'w' | 'b'; // The color the player is playing in this specific game
  botSkill: 'easy' | 'medium' | 'hard'; // For bot games
  turn: 'w' | 'b';
  opponentElo: number; // Elo of the bot/opponent
  opponentJustMoved: boolean;
  lastActivityTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class HydraGameEngineService {
  private gamesMap = signal<Map<string, HydraGame>>(new Map());
  public readonly games = computed(() => Array.from(this.gamesMap().values()));

  private gameLoop$: Observable<number>;
  private destroy$ = new Subject<void>();

  constructor() {
    // Game loop for updating timers
    this.gameLoop$ = interval(100)
      .pipe(takeUntil(this.destroy$))
      .pipe(map(() => Date.now()));

    this.gameLoop$.subscribe((currentTime) => {
      const INACTIVITY_THRESHOLD_MS = 20 * 1000; // 20 seconds
      this.gamesMap.update((currentMap) => {
        const newMap = new Map(currentMap);
        newMap.forEach((game, gameId) => {
          if (game.status === 'playing') {
            // Check for inactivity at the start of the game (low plyCount)
            if (
              game.plyCount <= 1 &&
              currentTime - game.lastActivityTime > INACTIVITY_THRESHOLD_MS
            ) {
              // Forfeit condition
              game.status = 'timeout'; // Use 'timeout' or introduce 'forfeit' status

              // In a real application, you'd trigger a server-side function to record this forfeit
              // and update player Elo accordingly.
            }

            const elapsedTime = currentTime - game.lastMoveTime;
            const newTimeRemaining = { ...game.timeRemaining };

            if (game.turn === 'w') {
              newTimeRemaining.white -= elapsedTime;
              if (newTimeRemaining.white <= 0) {
                game.status = 'timeout';
                newTimeRemaining.white = 0;

              }
            } else {
              newTimeRemaining.black -= elapsedTime;
              if (newTimeRemaining.black <= 0) {
                game.status = 'timeout';
                newTimeRemaining.black = 0;

              }
            }
            newMap.set(gameId, {
              ...game,
              timeRemaining: newTimeRemaining,
              lastMoveTime: currentTime
            });
          }
        });
        return newMap;
      });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createBotGame(
    initialTimeMinutes: number,
    incrementSeconds: number,
    playerColor: 'w' | 'b',
    botSkill: 'easy' | 'medium' | 'hard',
    opponentElo: number = 1500
  ): HydraGame {
    const gameId = this.generateGameId();
    const chess = new Chess();
    const initialTimeMs = initialTimeMinutes * 60 * 1000;

    const newGame: HydraGame = {
      id: gameId,
      chess: chess,
      fen: chess.fen(),
      lastMove: null,
      plyCount: 0,
      status: 'playing',
      timeRemaining: { white: initialTimeMs, black: initialTimeMs },
      increment: incrementSeconds,
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      playerColor: playerColor,
      botSkill: botSkill,
      turn: 'w', // Games always start with white
      opponentElo: opponentElo,
      opponentJustMoved: false,
      lastActivityTime: Date.now()
    };

    this.gamesMap.update((map) => {
      map.set(gameId, newGame);
      return new Map(map);
    });

    // If bot plays first (black), make its move immediately
    if (playerColor === 'b') {
      setTimeout(() => this.makeBotMove(gameId), 500); // Simulate thinking time
    }

    return newGame;
  }

  makeMove(gameId: string, from: string, to: string, promotion?: string): boolean {
    const game = this.gamesMap().get(gameId);
    if (!game || game.status !== 'playing' || game.turn !== game.playerColor) {
      return false;
    }

    const moveResult = game.chess.move({ from, to, promotion });

    if (moveResult) {
      const now = Date.now();
      const currentTurn = game.turn;

      const newTimeRemaining = { ...game.timeRemaining };
      if (currentTurn === 'w') {
        newTimeRemaining.white += game.increment * 1000;
      } else {
        newTimeRemaining.black += game.increment * 1000;
      }

      game.turn = game.chess.turn(); // Update turn after move
      this.updateGame(gameId, {
        fen: game.chess.fen(),
        lastMove: { from, to },
        plyCount: game.chess.history().length,
        status: this.getGameStatus(game.chess),
        timeRemaining: newTimeRemaining,
        lastMoveTime: now,
        lastActivityTime: now, // Update last activity time
        turn: game.chess.turn(),
        opponentJustMoved: false // Player just moved, so opponent hasn't yet
      });

      // If it's now bot's turn, make its move
      if (game.status === 'playing' && game.turn !== game.playerColor) {
        // Reset opponentJustMoved for all games, then set for current
        this.gamesMap.update((currentMap) => {
          const newMap = new Map(currentMap);
          newMap.forEach((g, id) => {
            newMap.set(id, { ...g, opponentJustMoved: false });
          });

          newMap.set(gameId, { ...newMap.get(gameId)!, opponentJustMoved: true });

          return newMap;
        });
        const botDelayMs = 500 + Math.random() * 1500;

        setTimeout(() => this.makeBotMove(gameId), botDelayMs); // Simulate thinking time
      }
      return true;
    }
    return false;
  }

  private makeBotMove(gameId: string): void {
    const game = this.gamesMap().get(gameId);
    if (!game || game.status !== 'playing' || game.turn === game.playerColor) {
      return;
    }

    // Simple bot logic: choose a random legal move
    const legalMoves = game.chess.moves({ verbose: true });
    if (legalMoves.length > 0) {
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      // Bot makes a move, so set opponentJustMoved to true for this game
      this.gamesMap.update((currentMap) => {
        const newMap = new Map(currentMap);
        newMap.forEach((g, id) => {
          newMap.set(id, { ...g, opponentJustMoved: false });
        });

        newMap.set(gameId, { ...newMap.get(gameId)!, opponentJustMoved: true });

        return newMap;
      });

      this.makeMove(gameId, randomMove.from, randomMove.to, randomMove.promotion);
    } else {
      // If no legal moves, game is over (stalemate, checkmate)
      this.updateGame(gameId, { status: this.getGameStatus(game.chess) });
      this.gamesMap.update((currentMap) => {
        const newMap = new Map(currentMap);
        newMap.forEach((g, id) => {
          newMap.set(id, { ...g, opponentJustMoved: false });
        });
        return newMap;
      });
    }
  }

  private updateGame(gameId: string, partialGame: Partial<HydraGame>): void {
    this.gamesMap.update((map) => {
      const existingGame = map.get(gameId);
      if (existingGame) {
        const updatedGame = { ...existingGame, ...partialGame };

        if (existingGame.status !== updatedGame.status) {
          // Status changed logic
        }

        map.set(gameId, updatedGame);
      }
      return new Map(map);
    });
  }

  private generateGameId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private getGameStatus(chess: Chess): HydraGame['status'] {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isStalemate()) return 'stalemate';
    if (chess.isDraw()) return 'draw';
    if (chess.isThreefoldRepetition() || chess.isInsufficientMaterial() || chess.isFiftyMoves())
      return 'draw';
    return 'playing';
  }

  // Remove a game (e.g., when it's finished or resigned)
  removeGame(gameId: string): void {
    this.gamesMap.update((map) => {
      map.delete(gameId);
      return new Map(map);
    });
  }
}
