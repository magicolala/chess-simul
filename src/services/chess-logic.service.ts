
import { Injectable, signal, computed, inject } from '@angular/core';
import { Chess, Move } from 'chess.js';
import { GoogleGenAI, Type } from '@google/genai';
import { HistoryService } from './history.service';

export interface GameConfig {
  timeMinutes: number;
  incrementSeconds: number;
  opponentCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface GameState {
  id: number;
  mode: 'simul' | 'friend'; // Added mode
  chess: Chess;
  fen: string;
  pgn: string;
  history: string[];
  status: 'active' | 'checkmate' | 'draw' | 'resigned' | 'timeout' | 'waiting';
  turn: 'w' | 'b';
  lastMove: { from: string; to: string } | null;
  opponentName: string;
  opponentRating: number;
  opponentAvatar: string;
  aiThinking: boolean;
  aiMessage: string;
  hasError: boolean;
  // Time management (ms)
  initialTime: number; // Added to calculate percentage
  whiteTime: number;
  blackTime: number;
  lastMoveTime: number;
}

const AI_PERSONALITIES = [
  { name: "Gemini Novice", rating: 800, style: "Play simple moves, make mistakes occasionally." },
  { name: "Gemini Club", rating: 1500, style: "Play solid standard chess." },
  { name: "Gemini Master", rating: 2200, style: "Play aggressive, tactical chess." },
  { name: "Gemini GM", rating: 2800, style: "Play perfectly and ruthlessly." },
  { name: "Gemini Troll", rating: 1200, style: "Play weird openings and taunt the opponent." },
  { name: "Gemini Scholar", rating: 1600, style: "Prefer classic book openings." },
  { name: "Gemini Blunder", rating: 600, style: "Often hang pieces." },
  { name: "Gemini Beast", rating: 3000, style: "Calculate deep mates." }
];

@Injectable({
  providedIn: 'root'
})
export class ChessSimulService {
  private gamesMap = new Map<number, GameState>();
  
  // Signal for reactive UI
  games = signal<GameState[]>([]);
  
  private genAI: GoogleGenAI;
  private historyService = inject(HistoryService);
  private timerInterval: any;
  private config: GameConfig = { timeMinutes: 10, incrementSeconds: 0, opponentCount: 4, difficulty: 'mixed' };

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
    
    // Global Timer Loop (ticks every 100ms)
    this.timerInterval = setInterval(() => {
        this.updateTimers();
    }, 100);
  }

  startSimul(config: GameConfig) {
    this.config = config;
    this.gamesMap.clear();
    const newGames: GameState[] = [];
    const baseTimeMs = config.timeMinutes * 60 * 1000;

    for (let i = 0; i < config.opponentCount; i++) {
      const chess = new Chess();
      const personality = AI_PERSONALITIES[i % AI_PERSONALITIES.length];
      
      const game: GameState = {
        id: i,
        mode: 'simul',
        chess: chess,
        fen: chess.fen(),
        pgn: chess.pgn(),
        history: [],
        status: 'active',
        turn: 'w',
        lastMove: null,
        opponentName: personality.name,
        opponentRating: personality.rating,
        opponentAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${personality.name}`,
        aiThinking: false,
        aiMessage: "Good luck!",
        hasError: false,
        initialTime: baseTimeMs,
        whiteTime: baseTimeMs,
        blackTime: baseTimeMs,
        lastMoveTime: Date.now()
      };
      this.gamesMap.set(i, game);
      newGames.push(game);
    }
    this.games.set(newGames);
  }

  startFriendGame(timeMinutes: number, increment: number, startColor: 'w' | 'b' | 'random') {
      this.gamesMap.clear(); // Clear existing simul if any, or we could append. Let's clear for focus.
      
      const chess = new Chess();
      const baseTimeMs = timeMinutes * 60 * 1000;
      
      this.config = { ...this.config, timeMinutes, incrementSeconds: increment };

      const game: GameState = {
          id: 999, // Special ID for friend game
          mode: 'friend',
          chess: chess,
          fen: chess.fen(),
          pgn: chess.pgn(),
          history: [],
          status: 'active',
          turn: 'w',
          lastMove: null,
          opponentName: "Ami (Local)",
          opponentRating: 0, // Unranked
          opponentAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=Friend`,
          aiThinking: false,
          aiMessage: "Partie amicale en cours",
          hasError: false,
          initialTime: baseTimeMs,
          whiteTime: baseTimeMs,
          blackTime: baseTimeMs,
          lastMoveTime: Date.now()
      };
      
      this.gamesMap.set(999, game);
      this.games.set([game]);
      return 999;
  }

  makeMove(gameId: number, from: string, to: string, promotion: string = 'q') {
    const game = this.gamesMap.get(gameId);
    if (!game || game.status !== 'active') return;

    // Apply time increment
    if (game.turn === 'w') game.whiteTime += this.config.incrementSeconds * 1000;
    else game.blackTime += this.config.incrementSeconds * 1000;
    
    try {
      const move = game.chess.move({ from, to, promotion });
      if (move) {
        this.updateGameState(gameId, move);
        
        // Trigger AI only if in simul mode
        if (game.mode === 'simul' && !game.chess.isGameOver()) {
          this.triggerAiMove(gameId);
        } else if (game.mode === 'friend') {
            game.aiMessage = game.turn === 'w' ? "Aux Blancs de jouer" : "Aux Noirs de jouer";
            // Checkmate/Draw handled in updateGameState
        } else {
            this.handleGameOver(game);
        }
      }
    } catch (e) {
      console.error('Invalid move', e);
    }
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
          let newAiMessage = game.aiMessage;
          let gameEndedInLoop = false;

          // Decrement time
          if (game.turn === 'w') {
              newWhiteTime -= delta;
              if (newWhiteTime <= 0) {
                  newWhiteTime = 0;
                  newStatus = 'timeout';
                  newAiMessage = "Temps écoulé ! Les Noirs gagnent.";
                  gameEndedInLoop = true;
              }
          } else {
              newBlackTime -= delta;
                if (newBlackTime <= 0) {
                  newBlackTime = 0;
                  newStatus = 'timeout';
                  newAiMessage = "Temps écoulé ! Les Blancs gagnent.";
                  gameEndedInLoop = true;
              }
          }

          const oldWhiteSeconds = Math.floor(game.whiteTime / 1000);
          const oldBlackSeconds = Math.floor(game.blackTime / 1000);
          const currentWhiteSeconds = Math.floor(newWhiteTime / 1000);
          const currentBlackSeconds = Math.floor(newBlackTime / 1000);

          const updatedGame: GameState = {
              ...game,
              whiteTime: newWhiteTime,
              blackTime: newBlackTime,
              lastMoveTime: now,
              status: newStatus,
              aiMessage: newAiMessage
          };

          this.gamesMap.set(id, updatedGame);

          if (gameEndedInLoop) {
               const result = (game.turn === 'w') ? 'loss' : 'win'; 
               // Record only if simul, friend games logic might differ or we record as 'casual'
               if (game.mode === 'simul') {
                    this.recordGame(updatedGame, result);
               }
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
          const winner = game.turn === 'w' ? 'Black' : 'White'; // If turn is white and checkmate -> Black won
          game.aiMessage = `Échec et mat ! ${winner === 'White' ? 'Les Blancs gagnent' : 'Les Noirs gagnent'}.`;
          
          if (game.mode === 'simul') {
            const isPlayerWin = game.turn === 'b';
            this.recordGame(game, isPlayerWin ? 'win' : 'loss');
          }

      } else if (game.chess.isDraw()) {
          game.status = 'draw';
          game.aiMessage = "Match nul.";
          if (game.mode === 'simul') this.recordGame(game, 'draw');
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

  private async triggerAiMove(gameId: number) {
    // ... (Existing AI Logic remains identical)
    const game = this.gamesMap.get(gameId);
    if (!game) return;

    game.aiThinking = true;
    game.hasError = false; // Reset error state on new turn
    this.games.set([...this.gamesMap.values()]); 

    const personality = AI_PERSONALITIES.find(p => p.name === game.opponentName) || AI_PERSONALITIES[0];

    try {
      if (!process.env['API_KEY']) {
          throw new Error('API_KEY_MISSING');
      }

      const prompt = `
        You are playing a chess game as Black against a human. 
        Your personality is: ${personality.name} (Rating: ${personality.rating}).
        Style: ${personality.style}.
        
        Current FEN: ${game.fen}
        Valid moves (SAN): ${game.chess.moves().join(', ')}

        Task:
        1. Choose the best move based on your rating/style.
        2. Provide a very short comment.

        Output JSON:
        {"move": "san_move", "comment": "string"}
      `;

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    move: { type: Type.STRING },
                    comment: { type: Type.STRING }
                },
                required: ['move', 'comment']
            }
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error('EMPTY_RESPONSE');
      
      let aiResponse;
      try {
          aiResponse = JSON.parse(responseText);
      } catch (jsonError) {
          console.error('[ChessService] JSON Parse Error:', jsonError);
          throw new Error('INVALID_JSON');
      }

      // Add increment for AI
      game.blackTime += this.config.incrementSeconds * 1000;

      game.aiThinking = false;
      game.aiMessage = aiResponse.comment;
      
      // Attempt the move from AI
      try {
          const move = game.chess.move(aiResponse.move); 
          this.updateGameState(gameId, move);
      } catch (moveError) {
          console.error(`[ChessService] AI suggested invalid move: ${aiResponse.move}`, moveError);
          throw new Error('INVALID_MOVE_SUGGESTION');
      }

    } catch (error: any) {
      console.error(`[ChessService] Game ${gameId} AI Error:`, error);
      
      game.aiThinking = false;
      game.hasError = true; // Mark as error state

      // Human-readable error mapping
      if (error.message === 'API_KEY_MISSING') {
          game.aiMessage = "⚠️ Erreur: Clé API manquante. Mode hors-ligne.";
      } else if (error.message === 'INVALID_MOVE_SUGGESTION') {
          game.aiMessage = "⚠️ Erreur: L'IA a tenté un coup illégal. Fallback activé.";
      } else if (error.toString().includes('429')) {
          game.aiMessage = "⚠️ Erreur: Trop de requêtes (Quota).";
      } else if (error.toString().includes('500') || error.toString().includes('503')) {
          game.aiMessage = "⚠️ Erreur: Serveur IA indisponible.";
      } else {
          game.aiMessage = "⚠️ Erreur technique. Coup aléatoire joué.";
      }

      // Fallback: Play random move to keep game alive
      const moves = game.chess.moves();
      if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          const move = game.chess.move(randomMove);
          this.updateGameState(gameId, move);
      } else {
          // If no moves available (should be handled by game over, but strictly speaking)
          this.handleGameOver(game);
      }
    }
  }
}
