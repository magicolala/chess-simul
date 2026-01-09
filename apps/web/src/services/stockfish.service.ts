import { Injectable } from '@angular/core';

export type StockfishBestMove = { from: string; to: string };

type WorkerMessage = string | { data?: string };

@Injectable({ providedIn: 'root' })
export class StockfishService {
  private worker?: Worker;
  private readyPromise?: Promise<void>;
  private initError?: Error;
  private currentRequestId = 0;

  /**
   * Reset the service to allow reinitialization after a failure
   */
  reset() {
    this.terminate();
    this.initError = undefined;
  }

  async initialize(): Promise<void> {
    if (this.initError) {
      // Allow callers to reset and retry
      console.warn('Stockfish previously failed to initialize:', this.initError.message);
      throw this.initError;
    }

    if (this.readyPromise) {
      return this.readyPromise;
    }

    if (typeof Worker === 'undefined') {
      this.initError = new Error('Web Workers are not supported in this environment.');
      throw this.initError;
    }

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker('/assets/stockfish-worker.js');
      } catch (error) {
        this.initError =
          error instanceof Error ? error : new Error('Unable to initialize Stockfish worker.');
        this.readyPromise = undefined; // Allow retry
        return reject(this.initError);
      }

      const cleanup = () => {
        this.worker?.removeEventListener('message', handleMessage);
        this.worker?.removeEventListener('error', handleError);
      };

      const handleError = (event: ErrorEvent) => {
        cleanup();
        this.worker?.terminate();
        this.worker = undefined;
        this.readyPromise = undefined; // Allow retry
        this.initError = new Error(event.message || 'Stockfish worker error.');
        reject(this.initError);
      };

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const payload = this.stringifyMessage(event.data);
        if (payload.includes('uciok')) {
          this.worker?.postMessage('isready');
        }
        if (payload.includes('readyok')) {
          cleanup();
          resolve();
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.addEventListener('error', handleError);

      this.worker.postMessage('uci');
    });

    return this.readyPromise;
  }

  async getBestMove(fen: string, depth = 10): Promise<StockfishBestMove | null> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Stockfish worker is not initialized.');
    }

    const requestId = ++this.currentRequestId;

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        if (requestId !== this.currentRequestId) {
          cleanup();
          return resolve(null);
        }

        const payload = this.stringifyMessage(event.data);
        if (payload.startsWith('bestmove')) {
          const parts = payload.split(' ');
          const bestmove = parts[1];
          cleanup();

          if (!bestmove || bestmove === '(none)') {
            return resolve(null);
          }

          return resolve({ from: bestmove.substring(0, 2), to: bestmove.substring(2, 4) });
        }
      };

      const handleError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || 'Stockfish worker crashed.'));
      };

      const cleanup = () => {
        this.worker?.removeEventListener('message', handleMessage);
        this.worker?.removeEventListener('error', handleError);
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.addEventListener('error', handleError);

      this.worker.postMessage('ucinewgame');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = undefined;
    this.readyPromise = undefined;
  }

  private stringifyMessage(message: WorkerMessage): string {
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && 'data' in message) {
      const data = (message as { data?: unknown }).data;
      return typeof data === 'string' ? data : '';
    }
    return '';
  }
}
