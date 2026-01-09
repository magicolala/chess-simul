import { Injectable, signal, inject } from '@angular/core';
import { Chess, Move } from 'chess.js';
import { HistoryService } from './history.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { StockfishService } from './stockfish.service';

export interface GameConfig {
  timeMinutes: number;
  incrementSeconds: number;
  opponentCount: number;
  difficulty: 'pvp';
  gameMode?: 'standard' | 'forced_piece';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isSelf: boolean;
  timestamp: number;
}

export interface GameState {
  id: number;
  sessionId: string;
  mode: 'local' | 'online' | 'simul-host' | 'simul-player';
  gameMode: 'standard' | 'forced_piece';
  chess: Chess;
  fen: string;
  pgn: string;
  history: string[];
  fenHistory: string[];
  viewIndex: number;
  status:
    | 'active'
    | 'checkmate'
    | 'stalemate'
    | 'draw'
    | 'resigned'
    | 'timeout'
    | 'waiting'
    | 'aborted';
  turn: 'w' | 'b';
  lastMove: { from: string; to: string } | null;

  // Players Info
  playerName: string;
  playerRating: number;
  playerColor?: 'w' | 'b';
  opponentName: string;
  opponentColor?: 'w' | 'b';
  opponentRating: number;
  opponentAvatar: string;

  resignedBy?: 'w' | 'b';

  systemMessage: string;
  chat: ChatMessage[];
  isProcessing: boolean;

  // Time management (ms)
  initialTime: number;
  whiteTime: number;
  blackTime: number;
  lastMoveTime: number;

  // Simul specific
  isHostTurn: boolean;
  requiresAttention?: boolean;

  // Forced-Piece mode state
  brainStatus: 'idle' | 'thinking' | 'ready';
  brainForcedFromSquare: string | null;
  brainForcedForPosition: string | null;

  // Online Specific
  eloChange?: number;
  rematchOfferedBy?: 'me' | 'opponent';
  hydraPoints?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChessSimulService {
  private gamesMap = new Map<number, GameState>();
  private stockfish = inject(StockfishService);
  private brainRequests = new Map<number, number>();

  // Reactive State
  games = signal<GameState[]>([]);

  private apiService = inject(ApiService);
  private historyService = inject(HistoryService);
  private auth = inject(AuthService);
  private timerInterval?: ReturnType<typeof setTimeout>;
  private config: GameConfig = {
    timeMinutes: 10,
    incrementSeconds: 0,
    opponentCount: 1,
    difficulty: 'pvp',
    gameMode: 'standard'
  };

  hydraScoreboard = signal({
    totalPoints: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    activeBoards: 0,
    potential: 0
  });

  constructor() {
    this.startTimer();
  }

  private startTimer() {
    this.timerInterval = setTimeout(() => {
      this.updateTimers();
      // Only continue the timer if there are active games
      if (Array.from(this.gamesMap.values()).some((game) => game.status === 'active')) {
        this.startTimer();
      }
    }, 100);
  }

  ngOnDestroy() {
    clearTimeout(this.timerInterval);
  }

  /**
   * Starts a Simultaneous Exhibition as the Host.
   */
  startSimulHosting(config: GameConfig) {
    this.config = config;
    this.gamesMap.clear();
    const newGames: GameState[] = [];
    const baseTimeMs = config.timeMinutes * 60 * 1000;

    this.hydraScoreboard.set({
      totalPoints: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      activeBoards: config.opponentCount,
      potential: config.opponentCount * 3
    });

    for (let i = 0; i < config.opponentCount; i++) {
      const chess = new Chess();
      const hostIsWhite = true;

      const game: GameState = {
        id: i,
        sessionId: `simul-${Date.now()}-${i}`,
        mode: 'simul-host',
        gameMode: config.gameMode ?? 'standard',
        chess: chess,
        fen: chess.fen(),
        pgn: chess.pgn(),
        history: [],
        fenHistory: [chess.fen()],
        viewIndex: -1,
        status: 'active',
        turn: 'w',
        lastMove: null,
        playerName: 'Hôte (Vous)',
        playerRating: this.auth.currentUser()?.elo ?? 1200,
        playerColor: 'w',
        opponentName: `Challenger #${i + 1}`,
        opponentColor: 'b',
        opponentRating: 1200 + Math.floor(Math.random() * 800),
        opponentAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=challenger${i}`,
        systemMessage: 'En attente du coup...',
        chat: [
          {
            id: 'sys',
            sender: 'Système',
            text: 'Début de la partie.',
            isSelf: false,
            timestamp: Date.now()
          }
        ],
        isProcessing: false,
        initialTime: baseTimeMs,
        whiteTime: baseTimeMs,
        blackTime: baseTimeMs,
        lastMoveTime: Date.now(),
        isHostTurn: hostIsWhite,
        requiresAttention: false,
        brainStatus: 'idle',
        brainForcedFromSquare: null,
        brainForcedForPosition: null
      };

      this.gamesMap.set(i, game);
      newGames.push(game);
    }
    this.games.set(newGames);

    newGames.forEach((g) => {
      if (g.gameMode === 'forced_piece') {
        void this.refreshForcedPiece(g.id);
      }
    });
  }

  /**
   * Starts a PvP Session (Local or Online initialized)
   */
  startPvpSession(
    config: GameConfig,
    mode: 'local' | 'online' = 'local',
    onlineMetadata?: Partial<GameState>
  ) {
    this.config = config;
    this.gamesMap.clear();
    const newGames: GameState[] = [];

    const game = this.createGameInstance(0, config, mode);

    // Override defaults with online metadata if provided
    if (mode === 'online' && onlineMetadata) {
      Object.assign(game, onlineMetadata);
      // Determine playerColor and opponentColor explicitly if not already set by metadata
      if (!game.playerColor) {
        // Default to white if not specified in metadata for online games
        game.playerColor = 'w';
        game.opponentColor = 'b';
      }
    }

    newGames.push(this.gamesMap.get(0)!);
    this.games.set(newGames);

    if (game.gameMode === 'forced_piece') {
      void this.refreshForcedPiece(game.id);
    }
  }

  private createGameInstance(internalId: number, config: GameConfig, mode: 'local' | 'online') {
    const chess = new Chess();
    const baseTimeMs = config.timeMinutes * 60 * 1000;

    const game: GameState = {
      id: internalId,
      sessionId: `pending-${Date.now()}`,
      mode: mode,
      gameMode: config.gameMode ?? 'standard',
      chess: chess,
      fen: chess.fen(),
      pgn: chess.pgn(),
      history: [],
      fenHistory: [chess.fen()],
      viewIndex: -1,
      status: 'active',
      turn: 'w',
      lastMove: null,
      playerName: 'Joueur 1',
      playerRating: this.auth.currentUser()?.elo ?? 1200,
      playerColor: 'w',
      opponentName: mode === 'local' ? 'Joueur 2' : 'Adversaire',
      opponentColor: 'b',
      opponentRating: 1200,
      opponentAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${internalId}`,
      isProcessing: false,
      systemMessage: 'À vous de jouer !',
      chat: [],
      initialTime: baseTimeMs,
      whiteTime: baseTimeMs,
      blackTime: baseTimeMs,
      lastMoveTime: Date.now(),
      isHostTurn: true,
      requiresAttention: false,
      brainStatus: 'idle',
      brainForcedFromSquare: null,
      brainForcedForPosition: null
    };

    this.gamesMap.set(internalId, game);
    return game;
  }

  makeMove(gameId: number, from: string, to: string, promotion: string = 'q') {
    const game = this.gamesMap.get(gameId);
    if (!game || game.status !== 'active') return;

    if (game.mode === 'simul-host') {
      game.requiresAttention = false;
    }

    if (this.shouldRejectMove(game, from)) {
      game.systemMessage = `Cerveau : vous devez jouer la pièce en ${game.brainForcedFromSquare}.`;
      this.games.set([...this.gamesMap.values()]);
      return;
    }

    if (game.turn === 'w') game.whiteTime += this.config.incrementSeconds * 1000;
    else game.blackTime += this.config.incrementSeconds * 1000;

    try {
      const move = game.chess.move({ from, to, promotion });
      if (move) {
        this.updateGameState(gameId, move);

        if (game.mode === 'simul-host') {
          game.systemMessage = "Tour de l'adversaire...";
          game.isHostTurn = false;

          // Simulation: Opponent plays back after 3 seconds (random move)
          setTimeout(
            () => {
              if (game.status === 'active') {
                const possibleMoves = game.chess.moves();
                if (possibleMoves.length > 0) {
                  const randomMove =
                    possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                  const m = game.chess.move(randomMove);
                  game.blackTime += this.config.incrementSeconds * 1000;
                  this.updateGameState(gameId, m);
                  game.systemMessage = 'À vous de jouer !';
                  game.isHostTurn = true;
                  game.requiresAttention = true;
                  this.games.set([...this.gamesMap.values()]);
                }
              }
            },
            3000 + Math.random() * 2000
          );
        } else if (game.mode === 'online') {
          // For the demo, we simulate online opponent move
          // In real app, this would be handled by socket event
          game.systemMessage = "En attente de l'adversaire...";
          setTimeout(() => {
            if (game.status === 'active' && game.turn !== 'w') {
              // Assuming player is white for demo
              const possibleMoves = game.chess.moves();
              if (possibleMoves.length > 0) {
                const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                const m = game.chess.move(randomMove);
                game.blackTime += this.config.incrementSeconds * 1000;
                this.updateGameState(gameId, m);
                game.systemMessage = 'À vous de jouer !';
                this.games.set([...this.gamesMap.values()]);
              }
            }
          }, 2000);
        } else {
          game.systemMessage = game.turn === 'w' ? 'Tour des Blancs' : 'Tour des Noirs';
        }

        this.games.set([...this.gamesMap.values()]);
      }
    } catch (e) {
      console.error('Invalid move', e);
    }
  }

  // --- CHAT FUNCTIONALITY ---
  sendChatMessage(gameId: number, text: string) {
    const game = this.gamesMap.get(gameId);
    if (!game) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: game.playerName,
      text: text,
      isSelf: true,
      timestamp: Date.now()
    };

    game.chat = [...game.chat, userMsg];
    this.games.set([...this.gamesMap.values()]);

    // Mock opponent response
    if ((game.mode === 'simul-host' || game.mode === 'online') && Math.random() > 0.7) {
      setTimeout(() => {
        const responses = ['Bien joué !', 'Hmm...', 'Intéressant.', 'Je réfléchis...', 'Oups.'];
        const reply: ChatMessage = {
          id: Date.now().toString(),
          sender: game.opponentName,
          text: responses[Math.floor(Math.random() * responses.length)],
          isSelf: false,
          timestamp: Date.now()
        };
        game.chat = [...game.chat, reply];
        this.games.set([...this.gamesMap.values()]);
      }, 2000);
    }
  }

  navigateHistory(gameId: number, direction: 'start' | 'prev' | 'next' | 'end') {
    const game = this.gamesMap.get(gameId);
    if (!game) return;

    const lastHistoricalIndex = Math.max(0, game.fenHistory.length - 2);
    const atLatestPosition = game.viewIndex === -1;
    let nextIndex = game.viewIndex;

    switch (direction) {
      case 'start':
        nextIndex = 0;
        break;
      case 'prev':
        nextIndex = atLatestPosition
          ? Math.max(0, game.fenHistory.length - 3)
          : Math.max(0, game.viewIndex - 1);
        break;
      case 'next':
        if (atLatestPosition) return;
        nextIndex = game.viewIndex + 1 > lastHistoricalIndex ? -1 : game.viewIndex + 1;
        break;
      case 'end':
        nextIndex = -1;
        break;
    }

    game.viewIndex = nextIndex;
    this.gamesMap.set(gameId, { ...game });
    this.games.set([...this.gamesMap.values()]);
  }

  resign(gameId: number) {
    const game = this.gamesMap.get(gameId);
    if (!game || game.status !== 'active') return;

    game.status = 'resigned';
    game.resignedBy = game.playerColor; // Set the color of the player who resigned
    game.systemMessage =
      game.playerColor === 'w' ? 'Les Blancs ont abandonné.' : 'Les Noirs ont abandonné.'; // More generic message
    this.recordGame(game, 'loss'); // This 'loss' is from the perspective of the player resigning
    this.gamesMap.set(gameId, { ...game });
    this.games.set([...this.gamesMap.values()]);
  }

  offerDraw(gameId: number) {
    // Simulation: Opponent refuses or accepts randomly
    const game = this.gamesMap.get(gameId);
    if (!game || game.status !== 'active') return;

    game.systemMessage = 'Nulle proposée...';
    this.games.set([...this.gamesMap.values()]);

    setTimeout(() => {
      if (Math.random() > 0.5) {
        game.status = 'draw';
        game.systemMessage = 'Adversaire a accepté la nulle.';
        this.recordGame(game, 'draw');
      } else {
        game.systemMessage = 'Nulle refusée. Continuez à jouer.';
      }
      this.gamesMap.set(gameId, { ...game });
      this.games.set([...this.gamesMap.values()]);
    }, 1500);
  }

  private updateTimers() {
    const now = Date.now();
    let shouldUpdateSignal = false;

    Array.from(this.gamesMap.keys()).forEach((id) => {
      const game = this.gamesMap.get(id);
      if (!game || game.status !== 'active') return;

      const delta = now - game.lastMoveTime;

      let newWhiteTime = game.whiteTime;
      let newBlackTime = game.blackTime;
      let newStatus: GameState['status'] = game.status;
      let newMsg = game.systemMessage;
      let gameEndedInLoop = false;

      if (game.turn === 'w') {
        newWhiteTime -= delta;
        if (newWhiteTime <= 0) {
          newWhiteTime = 0;
          newStatus = 'timeout';
          newMsg = 'Temps écoulé ! Les Noirs gagnent.';
          gameEndedInLoop = true;
        }
      } else {
        newBlackTime -= delta;
        if (newBlackTime <= 0) {
          newBlackTime = 0;
          newStatus = 'timeout';
          newMsg = 'Temps écoulé ! Les Blancs gagnent.';
          gameEndedInLoop = true;
        }
      }

      const currentWhiteSeconds = Math.floor(newWhiteTime / 1000);
      const oldWhiteSeconds = Math.floor(game.whiteTime / 1000);
      const currentBlackSeconds = Math.floor(newBlackTime / 1000);
      const oldBlackSeconds = Math.floor(game.blackTime / 1000);

      const updatedGame: GameState = {
        ...game,
        whiteTime: newWhiteTime,
        blackTime: newBlackTime,
        lastMoveTime: now,
        status: newStatus,
        systemMessage: newMsg
      };

      this.gamesMap.set(id, updatedGame);

      if (gameEndedInLoop) {
        let result: 'win' | 'loss' = 'loss'; // Default to loss
        if (game.playerColor === 'w' && newBlackTime <= 0) {
          // White player, black ran out of time
          result = 'win';
        } else if (game.playerColor === 'b' && newWhiteTime <= 0) {
          // Black player, white ran out of time
          result = 'win';
        }
        this.recordGame(updatedGame, result);
        shouldUpdateSignal = true;
      } else if (
        currentWhiteSeconds !== oldWhiteSeconds ||
        currentBlackSeconds !== oldBlackSeconds
      ) {
        shouldUpdateSignal = true;
      }
    });

    if (shouldUpdateSignal) {
      this.games.set([...this.gamesMap.values()]);
    }
  }

  private updateGameState(gameId: number, lastMove: Move | null) {
    const game = this.gamesMap.get(gameId);
    if (!game) return;

    game.fen = game.chess.fen();
    game.fenHistory.push(game.fen);

    if (lastMove && game.turn !== game.chess.turn()) {
      game.viewIndex = -1;
    }

    game.pgn = game.chess.pgn();
    game.turn = game.chess.turn();
    game.history = game.chess.history();
    game.lastMoveTime = Date.now();

    // In Simul Mode host side logic
    if (game.mode === 'simul-host') {
      // Host is usually White. If turn is W, it's host turn.
      game.isHostTurn = game.turn === 'w';
    }

    if (lastMove) {
      game.lastMove = { from: lastMove.from, to: lastMove.to };
    }

    if (game.chess.isGameOver()) {
      this.handleGameOver(game);
    }

    this.gamesMap.set(gameId, { ...game });
    this.games.set([...this.gamesMap.values()]);

    void this.refreshForcedPiece(gameId);
  }

  recalculateForcedPiece(gameId: number) {
    void this.refreshForcedPiece(gameId);
  }

  private shouldRejectMove(game: GameState, from: string): boolean {
    if (game.gameMode !== 'forced_piece') return false;
    if (game.brainStatus !== 'ready') return false;
    if (!game.brainForcedFromSquare) return false;
    if (game.brainForcedForPosition && game.brainForcedForPosition !== game.fen) {
      void this.refreshForcedPiece(game.id);
      return true;
    }
    return game.brainForcedFromSquare !== from;
  }

  private resetBrainState(game: GameState) {
    game.brainStatus = 'idle';
    game.brainForcedFromSquare = null;
    game.brainForcedForPosition = null;
  }

  private async refreshForcedPiece(gameId: number) {
    const game = this.gamesMap.get(gameId);
    if (!game) return;

    if (game.gameMode !== 'forced_piece' || game.status !== 'active') {
      this.resetBrainState(game);
      this.gamesMap.set(gameId, { ...game });
      this.games.set([...this.gamesMap.values()]);
      return;
    }

    const requestId = Date.now();
    this.brainRequests.set(gameId, requestId);

    game.brainStatus = 'thinking';
    game.brainForcedFromSquare = null;
    game.brainForcedForPosition = null;
    this.gamesMap.set(gameId, { ...game });
    this.games.set([...this.gamesMap.values()]);

    try {
      const bestMove = await this.stockfish.getBestMove(game.fen);
      const latestGame = this.gamesMap.get(gameId);
      if (!latestGame) return;

      if (this.brainRequests.get(gameId) !== requestId) return;

      if (bestMove) {
        latestGame.brainStatus = 'ready';
        latestGame.brainForcedFromSquare = bestMove.from;
        latestGame.brainForcedForPosition = latestGame.fen;
      } else {
        this.resetBrainState(latestGame);
      }

      this.gamesMap.set(gameId, { ...latestGame });
      this.games.set([...this.gamesMap.values()]);
    } catch (error) {
      console.error('Stockfish recalculation failed', error);
      const latestGame = this.gamesMap.get(gameId);
      if (!latestGame) return;

      latestGame.brainStatus = 'idle';
      latestGame.brainForcedFromSquare = null;
      latestGame.brainForcedForPosition = null;
      latestGame.systemMessage = 'Le moteur de calcul est indisponible pour le moment.';
      this.gamesMap.set(gameId, { ...latestGame });
      this.games.set([...this.gamesMap.values()]);
    }
  }

  private handleGameOver(game: GameState) {
    if (['checkmate', 'stalemate', 'draw', 'timeout', 'resigned', 'aborted'].includes(game.status))
      return;

    if (game.chess.isCheckmate()) {
      game.status = 'checkmate';
      const winnerColor = game.turn === 'w' ? 'b' : 'w'; // The color of the player who delivered checkmate
      game.systemMessage = `Échec et mat ! ${winnerColor === 'w' ? 'Les Blancs gagnent' : 'Les Noirs gagnent'}.`;

      let isWin = false;
      if (game.playerColor === winnerColor) {
        isWin = true;
      }

      this.recordGame(game, isWin ? 'win' : 'loss');
    } else if (game.chess.isStalemate()) {
      game.status = 'stalemate';
      game.systemMessage = 'Pat. Match nul.';
      this.recordGame(game, 'draw');
    } else if (game.chess.isDraw()) {
      game.status = 'draw';
      game.systemMessage = 'Match nul.';
      this.recordGame(game, 'draw');
    } else if (game.status === 'resigned') {
      // This case should be handled by the resign() method directly setting resignedBy.
      // However, if it reaches here (e.g., from an external event), we ensure consistency.
      // For now, we assume resign() sets it. No changes needed here for `resignedBy` if resign() is called first.
      // The recordGame (loss) is handled by the resign() call itself.
    }
    this.gamesMap.set(game.id, { ...game });
  }

  private recordGame(game: GameState, result: 'win' | 'loss' | 'draw') {
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      const delta = this.calculateEloDelta(result, game.playerRating, game.opponentRating);
      game.eloChange = delta;
      game.playerRating = Math.round(game.playerRating + delta);
      this.auth.updateElo(game.playerRating);
    }

    const hydraPoints = this.calculateHydraPoints(result);
    game.hydraPoints = hydraPoints;

    if (game.mode === 'simul-host') {
      this.applyHydraProgress(result, hydraPoints);
    }

    this.historyService.addResult({
      id: Date.now().toString() + Math.random(),
      opponentName: game.opponentName,
      opponentRating: game.opponentRating,
      opponentAvatar: game.opponentAvatar,
      result: result,
      date: Date.now(),
      fen: game.fen,
      hydraPoints
    });
  }

  private applyHydraProgress(result: 'win' | 'loss' | 'draw', hydraPoints: number) {
    this.hydraScoreboard.update((score) => {
      const wins = score.wins + (result === 'win' ? 1 : 0);
      const draws = score.draws + (result === 'draw' ? 1 : 0);
      const losses = score.losses + (result === 'loss' ? 1 : 0);
      const activeBoards = Math.max(score.activeBoards - 1, 0);

      return {
        totalPoints: score.totalPoints + hydraPoints,
        wins,
        draws,
        losses,
        activeBoards,
        potential: activeBoards * 3
      };
    });
  }

  private calculateHydraPoints(result: 'win' | 'loss' | 'draw') {
    if (result === 'win') return 3;
    if (result === 'draw') return 1;
    return -1;
  }

  private calculateEloDelta(
    result: 'win' | 'loss' | 'draw',
    playerRating: number,
    opponentRating: number
  ): number {
    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const expectedScore = this.expectedScore(playerRating, opponentRating);
    const kFactor = this.getKFactor(playerRating);
    return Math.round(kFactor * (actualScore - expectedScore));
  }

  private expectedScore(playerRating: number, opponentRating: number): number {
    const diff = Math.min(Math.max(playerRating - opponentRating, -400), 400);
    return 1 / (1 + Math.pow(10, -diff / 400));
  }

  private getKFactor(playerRating: number): number {
    const gamesPlayed = this.historyService.history().length;
    if (gamesPlayed < 30) return 40;
    if (playerRating < 2400) return 20;
    return 10;
  }
}
