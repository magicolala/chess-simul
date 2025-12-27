
import { Injectable, signal, inject } from '@angular/core';
import { Chess, Move } from 'chess.js';
import { HistoryService } from './history.service';
import { ApiService, CreateGameRequest } from './api.service';

export interface GameConfig {
  timeMinutes: number;
  incrementSeconds: number;
  opponentCount: number;
  difficulty: 'pvp';
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
  chess: Chess;
  fen: string;
  pgn: string;
  history: string[]; 
  fenHistory: string[];
  viewIndex: number;
  status: 'active' | 'checkmate' | 'draw' | 'resigned' | 'timeout' | 'waiting' | 'aborted';
  turn: 'w' | 'b';
  lastMove: { from: string; to: string } | null;
  
  // Players Info
  playerName: string; 
  opponentName: string;
  opponentRating: number;
  opponentAvatar: string;
  
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

  // Online Specific
  eloChange?: number;
  rematchOfferedBy?: 'me' | 'opponent';
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
    this.timerInterval = setInterval(() => {
        this.updateTimers();
    }, 100);
  }

  /**
   * Starts a Simultaneous Exhibition as the Host.
   */
  startSimulHosting(config: GameConfig) {
      this.config = config;
      this.gamesMap.clear();
      const newGames: GameState[] = [];
      const baseTimeMs = config.timeMinutes * 60 * 1000;

      for (let i = 0; i < config.opponentCount; i++) {
          const chess = new Chess();
          const hostIsWhite = true; 

          const game: GameState = {
              id: i,
              sessionId: `simul-${Date.now()}-${i}`,
              mode: 'simul-host',
              chess: chess,
              fen: chess.fen(),
              pgn: chess.pgn(),
              history: [],
              fenHistory: [chess.fen()],
              viewIndex: -1,
              status: 'active',
              turn: 'w',
              lastMove: null,
              playerName: "Hôte (Vous)",
              opponentName: `Challenger #${i + 1}`,
              opponentRating: 1200 + Math.floor(Math.random() * 800),
              opponentAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=challenger${i}`,
              systemMessage: "En attente du coup...",
              chat: [
                  { id: 'sys', sender: 'Système', text: 'Début de la partie.', isSelf: false, timestamp: Date.now() }
              ],
              isProcessing: false,
              initialTime: baseTimeMs,
              whiteTime: baseTimeMs,
              blackTime: baseTimeMs,
              lastMoveTime: Date.now(),
              isHostTurn: hostIsWhite 
          };
          
          this.gamesMap.set(i, game);
          newGames.push(game);
      }
      this.games.set(newGames);
  }

  /**
   * Starts a PvP Session (Local or Online initialized)
   */
  startPvpSession(config: GameConfig, mode: 'local' | 'online' = 'local', onlineMetadata?: Partial<GameState>) {
    this.config = config;
    this.gamesMap.clear();
    const newGames: GameState[] = [];
    
    const game = this.createGameInstance(0, config, mode);
    
    // Override defaults with online metadata if provided
    if (mode === 'online' && onlineMetadata) {
        Object.assign(game, onlineMetadata);
    }

    newGames.push(this.gamesMap.get(0)!);
    this.games.set(newGames);
  }

  private createGameInstance(internalId: number, config: GameConfig, mode: 'local' | 'online') {
      const chess = new Chess();
      const baseTimeMs = config.timeMinutes * 60 * 1000;

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
        playerName: "Joueur 1",
        opponentName: mode === 'local' ? "Joueur 2" : "Adversaire",
        opponentRating: 1200,
        opponentAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${internalId}`,
        isProcessing: false,
        systemMessage: "À vous de jouer !",
        chat: [],
        initialTime: baseTimeMs,
        whiteTime: baseTimeMs,
        blackTime: baseTimeMs,
        lastMoveTime: Date.now(),
        isHostTurn: true
      };

      this.gamesMap.set(internalId, game);
      return game;
  }

  makeMove(gameId: number, from: string, to: string, promotion: string = 'q') {
    const game = this.gamesMap.get(gameId);
    if (!game || game.status !== 'active') return;

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
            setTimeout(() => {
                if (game.status === 'active') {
                    const possibleMoves = game.chess.moves();
                    if (possibleMoves.length > 0) {
                        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                        const m = game.chess.move(randomMove);
                        game.blackTime += this.config.incrementSeconds * 1000;
                        this.updateGameState(gameId, m);
                        game.systemMessage = "À vous de jouer !";
                        game.isHostTurn = true;
                        this.games.set([...this.gamesMap.values()]);
                    }
                }
            }, 3000 + Math.random() * 2000);

        } else if (game.mode === 'online') {
             // For the demo, we simulate online opponent move
             // In real app, this would be handled by socket event
             game.systemMessage = "En attente de l'adversaire...";
             setTimeout(() => {
                if (game.status === 'active' && game.turn !== 'w') { // Assuming player is white for demo
                    const possibleMoves = game.chess.moves();
                    if (possibleMoves.length > 0) {
                        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                        const m = game.chess.move(randomMove);
                        game.blackTime += this.config.incrementSeconds * 1000;
                        this.updateGameState(gameId, m);
                        game.systemMessage = "À vous de jouer !";
                        this.games.set([...this.gamesMap.values()]);
                    }
                }
             }, 2000);
        } else {
            game.systemMessage = game.turn === 'w' ? "Tour des Blancs" : "Tour des Noirs";
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
              const responses = ["Bien joué !", "Hmm...", "Intéressant.", "Je réfléchis...", "Oups."];
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

  resign(gameId: number) {
      const game = this.gamesMap.get(gameId);
      if(!game || game.status !== 'active') return;
      
      game.status = 'resigned';
      game.systemMessage = "Vous avez abandonné.";
      this.recordGame(game, 'loss');
      this.gamesMap.set(gameId, { ...game });
      this.games.set([...this.gamesMap.values()]);
  }

  offerDraw(gameId: number) {
      // Simulation: Opponent refuses or accepts randomly
      const game = this.gamesMap.get(gameId);
      if(!game || game.status !== 'active') return;

      game.systemMessage = "Nulle proposée...";
      this.games.set([...this.gamesMap.values()]);

      setTimeout(() => {
          if (Math.random() > 0.5) {
               game.status = 'draw';
               game.systemMessage = "Adversaire a accepté la nulle.";
               this.recordGame(game, 'draw');
          } else {
               game.systemMessage = "Nulle refusée. Continuez à jouer.";
          }
          this.gamesMap.set(gameId, { ...game });
          this.games.set([...this.gamesMap.values()]);
      }, 1500);
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
  }

  private handleGameOver(game: GameState) {
      if (['checkmate', 'draw', 'timeout', 'resigned', 'aborted'].includes(game.status)) return;

      if (game.chess.isCheckmate()) {
          game.status = 'checkmate';
          const winner = game.turn === 'w' ? 'Black' : 'White';
          game.systemMessage = `Échec et mat ! ${winner === 'White' ? 'Les Blancs gagnent' : 'Les Noirs gagnent'}.`;
          
          // Determine local player win/loss based on mode
          let isWin = false;
          if (game.mode === 'online') {
              // Assume player is always White for this demo simplicity
              isWin = winner === 'White';
          } else if (game.mode === 'local') {
              isWin = winner === 'White';
          } else {
               isWin = (game.mode === 'simul-host' && winner === 'White');
          }

          this.recordGame(game, isWin ? 'win' : 'loss');

      } else if (game.chess.isDraw()) {
          game.status = 'draw';
          game.systemMessage = "Match nul.";
          this.recordGame(game, 'draw');
      }
      this.gamesMap.set(game.id, { ...game });
  }

  private recordGame(game: GameState, result: 'win' | 'loss' | 'draw') {
      if (game.mode === 'online') {
          // Calculate Mock ELO Change
          if (result === 'win') game.eloChange = 8 + Math.floor(Math.random() * 8);
          if (result === 'loss') game.eloChange = -5 - Math.floor(Math.random() * 8);
          if (result === 'draw') game.eloChange = 0;
      }

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
