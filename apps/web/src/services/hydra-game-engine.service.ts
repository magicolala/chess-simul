import { Injectable, signal, computed } from '@angular/core';
import { Chess } from 'chess.js';
import { type Observable, interval, map, Subject } from 'rxjs';
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

  private gameLoop$!: Observable<number>;
  private destroy$ = new Subject<void>();

  constructor() {
    this.initializeGameLoop();
  }

  private initializeGameLoop() {
    this.gameLoop$ = interval(100)
      .pipe(takeUntil(this.destroy$))
      .pipe(map(() => Date.now()));

    this.gameLoop$.subscribe((currentTime) => {
      this.updateRunningGames(currentTime);
    });
  }

  private updateRunningGames(currentTime: number) {
    const INACTIVITY_THRESHOLD_MS = 20 * 1000;
    this.gamesMap.update((currentMap) => {
      const newMap = new Map(currentMap);
      newMap.forEach((game, gameId) => {
        if (game.status === 'playing') {
          this.checkInactivity(game, gameId, currentTime, INACTIVITY_THRESHOLD_MS);
          this.updateGameTimer(game, gameId, currentTime, newMap);
        }
      });
      return newMap;
    });
  }

  private checkInactivity(game: HydraGame, gameId: string, currentTime: number, threshold: number) {
    if (game.plyCount <= 1 && currentTime - game.lastActivityTime > threshold) {
      game.status = 'timeout';
      console.debug('[HydraGameEngine] inactivity forfeit', {
        gameId,
        lastActivityTime: game.lastActivityTime,
        currentTime
      });
    }
  }

  private updateGameTimer(game: HydraGame, gameId: string, currentTime: number, map: Map<string, HydraGame>) {
    const elapsedTime = currentTime - game.lastMoveTime;
    const newTimeRemaining = { ...game.timeRemaining };

    if (game.turn === 'w') {
      newTimeRemaining.white -= elapsedTime;
      if (newTimeRemaining.white <= 0) {
        game.status = 'timeout';
        newTimeRemaining.white = 0;
        console.debug('[HydraGameEngine] timeout reached', { gameId, side: 'white', elapsedTime });
      }
    } else {
      newTimeRemaining.black -= elapsedTime;
      if (newTimeRemaining.black <= 0) {
        game.status = 'timeout';
        newTimeRemaining.black = 0;
        console.debug('[HydraGameEngine] timeout reached', { gameId, side: 'black', elapsedTime });
      }
    }
    map.set(gameId, {
      ...game,
      timeRemaining: newTimeRemaining,
      lastMoveTime: currentTime
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
      this.applyMove(game, gameId, from, to);
      this.handleBotTurn(game, gameId);
      return true;
    }
    return false;
  }

  private applyMove(game: HydraGame, gameId: string, from: string, to: string) {
    const now = Date.now();
    // currentTurn was unused
    // const currentTurn = game.turn; 

    // Logic from original:
    // const newTimeRemaining = ... (increment)
    // game.turn = game.chess.turn();

    const newTimeRemaining = { ...game.timeRemaining };
    // We increment the side that just moved.
    // If turn is now 'b', it means 'w' just moved.
    // Assuming game.turn was NOT yet updated in my previous logic but chess.turn() IS updated.
    // The original logic used `currentTurn` captured before `game.turn = game.chess.turn()`.

    // Let's rely on `game.turn` before update.
    if (game.turn === 'w') {
      newTimeRemaining.white += game.increment * 1000;
    } else {
      newTimeRemaining.black += game.increment * 1000;
    }

    game.turn = game.chess.turn(); // Now update it.

    this.updateGame(gameId, {
      fen: game.chess.fen(),
      lastMove: { from, to },
      plyCount: game.chess.history().length,
      status: this.getGameStatus(game.chess),
      timeRemaining: newTimeRemaining,
      lastMoveTime: now,
      lastActivityTime: now,
      turn: game.chess.turn(),
      opponentJustMoved: false
    });
  }

  private handleBotTurn(game: HydraGame, gameId: string) {
    if (game.status === 'playing' && game.turn !== game.playerColor) {
      this.setOpponentJustMoved(gameId, true);

      const botDelayMs = 500 + Math.random() * 1500;
      console.debug('[HydraGameEngine] scheduling bot move', { gameId, botDelayMs });
      setTimeout(() => this.makeBotMove(gameId), botDelayMs);
    }
  }

  private setOpponentJustMoved(gameId: string, isMoving: boolean) {
    this.gamesMap.update((currentMap) => {
      const newMap = new Map(currentMap);
      newMap.forEach((g, id) => {
        newMap.set(id, { ...g, opponentJustMoved: false });
      });
      if (isMoving) {
        newMap.set(gameId, { ...newMap.get(gameId)!, opponentJustMoved: true });
      }
      return newMap;
    });
  }

  private makeBotMove(gameId: string): void {
    const game = this.gamesMap().get(gameId);
    if (!game || game.status !== 'playing' || game.turn === game.playerColor) {
      return;
    }

    const legalMoves = game.chess.moves({ verbose: true });
    if (legalMoves.length > 0) {
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      this.setOpponentJustMoved(gameId, true);

      console.debug('[HydraGameEngine] executing bot move', {
        gameId,
        move: { from: randomMove.from, to: randomMove.to }
      });
      this.makeMove(gameId, randomMove.from, randomMove.to, randomMove.promotion);
    } else {
      this.updateGame(gameId, { status: this.getGameStatus(game.chess) });
      this.setOpponentJustMoved(gameId, false);
    }
  }

  private updateGame(gameId: string, partialGame: Partial<HydraGame>): void {
    this.gamesMap.update((map) => {
      const existingGame = map.get(gameId);
      if (existingGame) {
        const updatedGame = { ...existingGame, ...partialGame };

        if (existingGame.status !== updatedGame.status) {
          console.debug('[HydraGameEngine] status change', {
            gameId,
            from: existingGame.status,
            to: updatedGame.status
          });
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
    if (chess.isCheckmate()) {
      return 'checkmate';
    }
    if (chess.isStalemate()) {
      return 'stalemate';
    }
    if (chess.isDraw()) {
      return 'draw';
    }
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
