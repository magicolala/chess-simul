import { test, expect } from '@playwright/test';

/**
 * Tests E2E simplifiés pour Stockfish - sans authentification
 * 
 * Ces tests vérifient que Stockfish fonctionne en initialisant directement
 * le worker dans le contexte du navigateur, sans passer par l'authentification.
 */

test.describe('Stockfish Integration (Standalone)', () => {
  test('should initialize Stockfish worker and get best move', async ({ page }) => {
    // Navigate to app (any public page works)
    await page.goto('/');
    
    // Listen to console logs for debugging
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    
    // Inject and test Stockfish directly in browser context
    const result = await page.evaluate(async () => {
      // Create worker
      let worker: Worker | null = null;
      
      try {
        // Pass the WASM path in the hash so stockfish.js can parse it correctly
        worker = new Worker('/assets/stockfish-worker.js#/assets/stockfish-nnue-16.wasm');
      } catch (err) {
        return { 
          success: false, 
          bestMove: null, 
          error: `Failed to create worker: ${err}` 
        };
      }
      
      return new Promise<{ success: boolean; bestMove: string | null; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          worker?.terminate();
          resolve({ success: false, bestMove: null, error: 'Timeout waiting for Stockfish (10s)' });
        }, 10000); // Increased timeout
        
        let isReady = false;
        
        worker!.addEventListener('message', (event) => {
          const msg = typeof event.data === 'string' ? event.data : event.data?.data || '';
          console.log('Stockfish:', msg);
          
          // Check for initialization
          if (msg.includes('uciok')) {
            worker!.postMessage('isready');
          }
          
          if (msg.includes('readyok')) {
            isReady = true;
            // Request best move for starting position
            worker!.postMessage('ucinewgame');
            worker!.postMessage('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            worker!.postMessage('go depth 10');
          }
          
          // Parse best move
          if (isReady && msg.startsWith('bestmove')) {
            clearTimeout(timeout);
            const parts = msg.split(' ');
            const bestMove = parts[1];
            worker!.terminate();
            
            resolve({
              success: true,
              bestMove: bestMove !== '(none)' ? bestMove : null
            });
          }
        });
        
        worker!.addEventListener('error', (error: ErrorEvent) => {
          console.error('Worker error:', error.message);
          clearTimeout(timeout);
          worker!.terminate();
          resolve({ success: false, bestMove: null, error: error.message });
        });
        
        // Initialize
        worker!.postMessage('uci');
      });
    });
    
    // Log console messages if test fails
    if (!result.success) {
      console.log('Browser console:', consoleMessages);
    }
    
    // Verify results
    expect(result.success, `Failed to initialize Stockfish: ${result.error}`).toBe(true);
    expect(result.bestMove).toBeTruthy();
    expect(result.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/); // Valid move format
    console.log('Stockfish suggested:', result.bestMove);
  });

  test('should suggest reasonable opening moves', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(async () => {
      const worker = new Worker('/assets/stockfish-worker.js');
      
      return new Promise<{ move: string | null }>((resolve) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({ move: null });
        }, 5000);
        
        let isReady = false;
        
        worker.addEventListener('message', (event) => {
          const msg = typeof event.data === 'string' ? event.data : event.data?.data || '';
          
          if (msg.includes('uciok')) {
            worker.postMessage('isready');
          }
          
          if (msg.includes('readyok')) {
            isReady = true;
            worker.postMessage('ucinewgame');
            worker.postMessage('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            worker.postMessage('go depth 10');
          }
          
          if (isReady && msg.startsWith('bestmove')) {
            clearTimeout(timeout);
            const parts = msg.split(' ');
            const bestMove = parts[1];
            worker.terminate();
            resolve({ move: bestMove });
          }
        });
        
        worker.postMessage('uci');
      });
    });
    
    // Common strong opening moves from starting position
    const validOpeningMoves = ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'e2e3', 'd2d3'];
    
    expect(result.move).toBeTruthy();
    expect(validOpeningMoves.some(m => result.move?.startsWith(m.substring(0, 4)))).toBe(true);
    console.log('Stockfish opening move:', result.move);
  });

  test('should calculate best move within reasonable time', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    const result = await page.evaluate(async () => {
      const worker = new Worker('/assets/stockfish-worker.js');
      
      return new Promise<{ move: string | null; calculationTime: number }>((resolve) => {
        const calcStart = Date.now();
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({ move: null, calculationTime: Date.now() - calcStart });
        }, 3000);
        
        let isReady = false;
        
        worker.addEventListener('message', (event) => {
          const msg = typeof event.data === 'string' ? event.data : event.data?.data || '';
          
          if (msg.includes('uciok')) {
            worker.postMessage('isready');
          }
          
          if (msg.includes('readyok')) {
            isReady = true;
            worker.postMessage('ucinewgame');
            worker.postMessage('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            worker.postMessage('go depth 8'); // Lower depth for speed
          }
          
          if (isReady && msg.startsWith('bestmove')) {
            clearTimeout(timeout);
            const calculationTime = Date.now() - calcStart;
            const parts = msg.split(' ');
            worker.terminate();
            resolve({ move: parts[1], calculationTime });
          }
        });
        
        worker.postMessage('uci');
      });
    });
    
    const totalTime = Date.now() - startTime;
    
    expect(result.move).toBeTruthy();
    expect(totalTime).toBeLessThan(3000); // Should be fast
    console.log(`Stockfish calculated in ${result.calculationTime}ms (total: ${totalTime}ms)`);
  });

  test('should handle tactical position (mate in 2)', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(async () => {
      const worker = new Worker('/assets/stockfish-worker.js');
      
      return new Promise<{ move: string | null }>((resolve) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({ move: null });
        }, 5000);
        
        let isReady = false;
        
        worker.addEventListener('message', (event) => {
          const msg = typeof event.data === 'string' ? event.data : event.data?.data || '';
          
          if (msg.includes('uciok')) {
            worker.postMessage('isready');
          }
          
          if (msg.includes('readyok')) {
            isReady = true;
            worker.postMessage('ucinewgame');
            // Simple mate in 2: Black to move, Qh4# is mate
            worker.postMessage('position fen r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1');
            worker.postMessage('go depth 12');
          }
          
          if (isReady && msg.startsWith('bestmove')) {
            clearTimeout(timeout);
            const parts = msg.split(' ');
            worker.terminate();
            resolve({ move: parts[1] });
          }
        });
        
        worker.postMessage('uci');
      });
    });
    
    expect(result.move).toBeTruthy();
    // Should find a defensive move (this position is already threatening mate, black needs to defend)
    console.log('Stockfish tactical move:', result.move);
  });

  test('should not crash on multiple calculations', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(async () => {
      const results: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const worker = new Worker('/assets/stockfish-worker.js');
        
        const move = await new Promise<string>((resolve) => {
          const timeout = setTimeout(() => {
            worker.terminate();
            resolve('timeout');
          }, 3000);
          
          let isReady = false;
          
          worker.addEventListener('message', (event) => {
            const msg = typeof event.data === 'string' ? event.data : event.data?.data || '';
            
            if (msg.includes('uciok')) {
              worker.postMessage('isready');
            }
            
            if (msg.includes('readyok')) {
              isReady = true;
              worker.postMessage('ucinewgame');
              worker.postMessage('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
              worker.postMessage('go depth 5');
            }
            
            if (isReady && msg.startsWith('bestmove')) {
              clearTimeout(timeout);
              const parts = msg.split(' ');
              worker.terminate();
              resolve(parts[1]);
            }
          });
          
          worker.postMessage('uci');
        });
        
        results.push(move);
      }
      
      return { results, allSucceeded: results.every(m => m !== 'timeout') };
    });
    
    expect(result.allSucceeded).toBe(true);
    expect(result.results).toHaveLength(3);
    console.log('Multiple calculations:', result.results);
  });
});
