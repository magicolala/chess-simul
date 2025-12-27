
import { Injectable, signal, inject } from '@angular/core';
import { Chess, Move } from 'chess.js';
import { HistoryService } from './history.service';
import { ApiService, CreateGameRequest } from './api.service';

export interface GameConfig {
  timeMinutes: number;
  incrementSeconds: number;
  opponentCount: number; // Kept for future multi-table features
  difficulty: 'pvp'; // Simplified
}

export interface GameState {
  id: number;
  sessionId: string; // Backend ID
  mode: 'local' | 'online';
  chess: Chess;
  fen: string;
  pgn: string;
  history: string[]; 
  fenHistory: string[];
  viewIndex: number;
  status: 'active' | 'checkmate' | 'draw' | 'resigned' | 'timeout' | 'waiting';
  turn: 'w' | 'b';
  lastMove: { from: string; to: string } | null;
  
  // Players Info
  opponentName: string;
  opponentRating: number;
  opponentAvatar: string;
  
  systemMessage: string;
  isProcessing: boolean; // Replaces aiThinking for API calls

  // Time management (ms)
  initialTime: number;
  whiteTime: number;
  blackTime: number;
  lastMoveTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChessSimulService {
  private gamesMap = new Map<number, GameState>();
  
  // Reactive State
  games = signal<GameState[]>([]);
  
  private apiService = inject(ApiService);
  private historyService = inject(HistoryService);
  private timerInterval: any;
  private config: GameConfig = { timeMinutes: 10, incrementSeconds: 0, opponentCount: 1, difficulty: 'pvp' };

  constructor() {
    // Global Timer Loop
    this.timerInterval = setInterval(() => {
        this.updateTimers();
    }, 100);
  }

  /**
   * Starts a new session. Currently supports Local PvP (Pass & Play).
   * Prepared to handle multiple games if we want a "Simul PvP" later.
   */
  startPvpSession(config: GameConfig) {
    this.config = config;
    this.gamesMap.clear();
    const newGames: GameState[] = [];
    
    // Create requested number of boards (default 1 for PvP usually)
    for (let i = 0; i < config.opponentCount; i++) {
       this.createGameInstance(i, config, 'local');
       newGames.push(this.gamesMap.get(i)!);
    }
    
    this.games.set(newGames);
  }

  /**
   * Helper to initialize a single game state
   */
  private createGameInstance(internalId: number, config: GameConfig, mode: 'local' | 'online') {
      const chess = new Chess();
      const baseTimeMs = config.timeMinutes * 60 * 1000;

      // Call API to register game (even if local, good practice to get an ID)
      const apiReq: CreateGameRequest = {
          opponentType: 'human',
          color: 'random',
          timeControl: { minutes: config.timeMinutes, increment: config.incrementSeconds }
      };

      this.apiService.createGame(apiReq).subscribe(session => {
         // Update the placeholder state with real session ID if needed
         // For now, we initialize synchronously for UI responsiveness
      });

      const game: GameState = {
        id: internalId,
        sessionId: `pending-${Date.now()}`,
        mode: mode,
        chess: chess,
        fen: chess.fen(),
        pgn: chess.pgn(),
        history: [],
        fenHistory: [chess.fen()],
        viewIndex: -1,
        status: 'active',
        turn: 'w',
        lastMove: null,
        opponentName: mode === 'local' ? "Joueur 2 (Local)" : "En attente...",
        opponentRating: 1200,
        opponentAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${internalId}`,
        isProcessing: false,
        systemMessage: "À vous de jouer !",
        initialTime: baseTimeMs,
        whiteTime: baseTimeMs,
        blackTime: baseTimeMs,
        lastMoveTime: Date.now()
      };

      this.gamesMap.set(internalId, game);
      return game;
  }

  makeMove(gameId: number, from: string, to: string, promotion: string = 'q') {
    const game = this.gamesMap.get(gameId);
    if (!game || game.status !== 'active') return;

    // Apply time increment locally before validation
    if (game.turn === 'w') game.whiteTime += this.config.incrementSeconds * 1000;
    else game.blackTime += this.config.incrementSeconds * 1000;
    
    try {
      const move = game.chess.move({ from, to, promotion });
      if (move) {
        // Optimistic UI Update
        this.updateGameState(gameId, move);
        
        // Prepare API Call
        if (game.mode === 'online') {
            game.isProcessing = true;
            this.games.set([...this.gamesMap.values()]);

            this.apiService.sendMove({
                gameId: game.sessionId,
                from, to, promotion
            }).subscribe({
                next: (res) => {
                    game.isProcessing = false;
                    // Sync FEN from server if needed:
                    // if (res.fen !== game.fen) ...
                    this.games.set([...this.gamesMap.values()]);
                },
                error: () => {
                   // Rollback logic would go here
                   game.isProcessing = false;
                   game.systemMessage = "Erreur de synchronisation.";
                   this.games.set([...this.gamesMap.values()]);
                }
            });
        } else {
            // Local Pass & Play
            game.systemMessage = game.turn === 'w' ? "Tour des Blancs" : "Tour des Noirs";
        }
      }
    } catch (e) {
      console.error('Invalid move', e);
    }
  }

  navigateHistory(gameId: number, direction: 'start' | 'prev' | 'next' | 'end') {
    const game = this.gamesMap.get(gameId);
    if (!game) return;

    const maxIndex = game.fenHistory.length - 1;
    let currentIndex = game.viewIndex === -1 ? maxIndex : game.viewIndex;

    switch (direction) {
        case 'start': currentIndex = 0; break;
        case 'prev': currentIndex = Math.max(0, currentIndex - 1); break;
        case 'next': currentIndex = Math.min(maxIndex, currentIndex + 1); break;
        case 'end': currentIndex = -1; break;
    }

    if (currentIndex === maxIndex) currentIndex = -1;

    game.viewIndex = currentIndex;
    this.gamesMap.set(gameId, { ...game });
    this.games.set([...this.gamesMap.values()]);
  }

  private updateTimers() {
      const now = Date.now();
      let shouldUpdateSignal = false;

      Array.from(this.gamesMap.keys()).forEach(id => {
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
                  newMsg = "Temps écoulé ! Les Noirs gagnent.";
                  gameEndedInLoop = true;
              }
          } else {
              newBlackTime -= delta;
                if (newBlackTime <= 0) {
                  newBlackTime = 0;
                  newStatus = 'timeout';
                  newMsg = "Temps écoulé ! Les Blancs gagnent.";
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
               const result = (game.turn === 'w') ? 'loss' : 'win'; 
               this.recordGame(updatedGame, result);
               shouldUpdateSignal = true;
          } else if (currentWhiteSeconds !== oldWhiteSeconds || currentBlackSeconds !== oldBlackSeconds) {
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
    
    if (lastMove) {
        game.lastMove = { from: lastMove.from, to: lastMove.to };
    }

    if (game.chess.isGameOver()) {
       this.handleGameOver(game);
    }

    this.gamesMap.set(gameId, { ...game });
    this.games.set([...this.gamesMap.values()]);
  }

  private handleGameOver(game: GameState) {
      if (['checkmate', 'draw', 'timeout', 'resigned'].includes(game.status)) return;

      if (game.chess.isCheckmate()) {
          game.status = 'checkmate';
          const winner = game.turn === 'w' ? 'Black' : 'White';
          game.systemMessage = `Échec et mat ! ${winner === 'White' ? 'Les Blancs gagnent' : 'Les Noirs gagnent'}.`;
          
          // In Local PvP, we record 'win' for current user for simplicity, 
          // but in real app we'd need to know WHO the user is playing as.
          this.recordGame(game, 'win');

      } else if (game.chess.isDraw()) {
          game.status = 'draw';
          game.systemMessage = "Match nul.";
          this.recordGame(game, 'draw');
      }
      this.gamesMap.set(game.id, { ...game });
  }

  private recordGame(game: GameState, result: 'win' | 'loss' | 'draw') {
      this.historyService.addResult({
          id: Date.now().toString() + Math.random(),
          opponentName: game.opponentName,
          opponentRating: game.opponentRating,
          opponentAvatar: game.opponentAvatar,
          result: result,
          date: Date.now(),
          fen: game.fen
      });
  }
}
