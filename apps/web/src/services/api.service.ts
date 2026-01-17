import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable, of, delay } from 'rxjs';

// DTOs (Data Transfer Objects) - Contracts with the backend
export interface CreateGameRequest {
  opponentType: 'human' | 'computer'; // Prepared for future
  color: 'w' | 'b' | 'random';
  timeControl: {
    minutes: number;
    increment: number;
  };
}

export interface MoveRequest {
  gameId: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface GameSession {
  id: string;
  fen: string;
  pgn: string;
  whiteId: string;
  blackId: string;
  status: 'active' | 'waiting' | 'finished';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://api.chessmaster.app/v1'; // Placeholder

  /**
   * Creates a new game session.
   * Simulates an HTTP POST request.
   */
  createGame(req: CreateGameRequest): Observable<GameSession> {
    // TODO: When backend is ready:
    // return this.http.post<GameSession>(`${this.API_URL}/games`, req);

    // MOCK IMPLEMENTATION
    const mockId = Math.random().toString(36).substring(7);
    return of({
      id: mockId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',
      whiteId: req.color === 'b' ? 'opponent' : 'player',
      blackId: req.color === 'b' ? 'player' : 'opponent',
      status: 'active'
    } as GameSession).pipe(delay(600)); // Simulate network latency
  }

  /**
   * Sends a move to the backend.
   */
  sendMove(req: MoveRequest): Observable<{ success: boolean; fen: string; isCheckmate: boolean }> {
    // TODO: When backend is ready:
    // return this.http.post<any>(`${this.API_URL}/games/${req.gameId}/move`, req);

    // MOCK IMPLEMENTATION (Validation happens in Logic Service for now in Pass & Play)
    return of({
      success: true,
      fen: `${req.from}${req.to}`, // Backend would calculate this
      isCheckmate: false
    }).pipe(delay(200));
  }
}
