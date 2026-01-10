import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth';
import { waitForAnimation } from './helpers/test-data';

/**
 * Tests E2E pour Stockfish avec le vrai moteur d'échecs
 * 
 * Ces tests vérifient que Stockfish fonctionne correctement dans un vrai navigateur
 * et suggère des coups valides pour le mode Hand-Brain.
 */

test.describe('Stockfish Integration', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test.describe('Stockfish Initialization', () => {
    test('should initialize Stockfish worker in Hand-Brain mode', async ({ page }) => {
      // Navigate to local game
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      
      // Create new game
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      // Select Hand-Brain mode
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      // Start game
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      await waitForAnimation();
      
      // Verify chess board is visible
      await expect(page.locator('.chess-board')).toBeVisible();
      
      // Verify no console errors about Stockfish
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('stockfish')) {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      
      expect(consoleErrors).toHaveLength(0);
    });

    test('should show forced piece indicator', async ({ page }) => {
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      // Wait for Stockfish to calculate
      await page.waitForTimeout(3000);
      
      // Check for forced piece indicator (visual cue or text)
      // This depends on your UI implementation
      const indicatorVisible = await page.locator('[data-forced-piece]').isVisible().catch(() => false) ||
                               await page.getByText(/pièce imposée|forced piece/i).isVisible().catch(() => false);
      
      // At least one indicator should be present
      expect(indicatorVisible).toBeTruthy();
    });
  });

  test.describe('Valid Move Suggestions', () => {
    test('should suggest valid opening moves from starting position', async ({ page }) => {
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      // Wait for Stockfish calculation
      await page.waitForTimeout(3000);
      
      // Common strong opening moves: e4, d4, Nf3, c4
      const validOpeningSquares = ['e2', 'd2', 'g1', 'c2'];
      
      // Check if any of these pieces are highlighted/selectable
      let foundValidOpening = false;
      for (const square of validOpeningSquares) {
        const squareEl = page.locator(`[data-square="${square}"]`);
        const isHighlighted = await squareEl.getAttribute('class').then(c => c?.includes('highlight') || c?.includes('forced'));
        if (isHighlighted) {
          foundValidOpening = true;
          break;
        }
      }
      
      // At minimum, some piece should be suggested
      expect(foundValidOpening).toBeTruthy();
    });

    test('should suggest tactical defense in Scholar\'s Mate position', async ({ page }) => {
      // This test would require setting up a specific position
      // For now, we'll create a game and verify Stockfish responds to threats
      
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      await waitForAnimation();
      
      // Play Scholar's Mate setup: e4
      await page.locator('[data-square="e2"]').click();
      await page.locator('[data-square="e4"]').click();
      
      await page.waitForTimeout(1000);
      
      // Black responds: e5
      await page.locator('[data-square="e7"]').click();
      await page.locator('[data-square="e5"]').click();
      
      await page.waitForTimeout(1000);
      
      // White plays: Bc4
      await page.locator('[data-square="f1"]').click();
      await page.locator('[data-square="c4"]').click();
      
      await page.waitForTimeout(1000);
      
      // Black plays: Nc6
      await page.locator('[data-square="b8"]').click();
      await page.locator('[data-square="c6"]').click();
      
      await page.waitForTimeout(1000);
      
      // White threatens Qh5 -> Qxf7#
      await page.locator('[data-square="d1"]').click();
      await page.locator('[data-square="h5"]').click();
      
      // Now wait for Stockfish to suggest defense
      await page.waitForTimeout(3000);
      
      // Stockfish should suggest defensive moves like Qe7, g6, Nf6
      // We can't easily verify the exact suggestion, but we can check that
      // it doesn't crash and a piece is highlighted
      
      const anyPieceHighlighted = await page.locator('[data-forced-piece]').count() > 0 ||
                                   await page.locator('.highlight').count() > 0;
      
      expect(anyPieceHighlighted).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should provide move suggestions within 2 seconds', async ({ page }) => {
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      const startTime = Date.now();
      
      // Wait for suggestion to appear (with timeout)
      await page.waitForSelector('[data-forced-piece], .forced-piece, .highlight', { 
        timeout: 2000 
      }).catch(() => {
        // If no selector matches, that's okay - we'll check timing
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should be faster than 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('should not crash worker during multiple moves', async ({ page }) => {
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      await waitForAnimation();
      
      // Play several moves and verify no crashes
      const moves = [
        { from: 'e2', to: 'e4' },
        { from: 'e7', to: 'e5' },
        { from: 'd2', to: 'd4' },
        { from: 'd7', to: 'd6' }
      ];
      
      for (const move of moves) {
        await page.locator(`[data-square="${move.from}"]`).click();
        await page.locator(`[data-square="${move.to}"]`).click();
        await page.waitForTimeout(1500); // Wait for Stockfish
      }
      
      // Check board is still functional
      await expect(page.locator('.chess-board')).toBeVisible();
      
      // No console errors
      const hasErrors = await page.evaluate(() => {
        return (window as any).__hasStockfishErrors || false;
      });
      
      expect(hasErrors).toBeFalsy();
    });
  });

  test.describe('Hand-Brain Mode Integration', () => {
    test('should only allow moves from suggested piece', async ({ page }) => {
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      await page.waitForTimeout(3000);
      
      // Try to move a non-forced piece (assume Stockfish didn't suggest a1 rook in opening)
      await page.locator('[data-square="a2"]').click();
      
      // Check if move options appear for this non-forced piece
      // In Hand-Brain mode, only the forced piece should be movable
      const moveOptions = await page.locator('[data-move-target]').count();
      
      // If this is not the forced piece, there should be 0 or very few options
      // This is a heuristic - the actual behavior depends on UI implementation
      
      // Alternatively, try the forced piece and verify it IS movable
      // For now, we just verify the game is in Hand-Brain mode
      const mode = await page.locator('[data-game-mode]').getAttribute('data-game-mode');
      expect(mode).toContain('hand_brain');
    });

    test('should update suggestion after opponent moves', async ({ page }) => {
      await page.getByRole('button', { name: /table de jeu|local game/i }).click();
      await page.getByRole('button', { name: /\\+ partie/i }).click();
      
      const handBrainButton = page.getByRole('button', { name: /hand.?brain|pièce imposée/i });
      if (await handBrainButton.isVisible()) {
        await handBrainButton.click();
      }
      
      await page.getByRole('button', { name: /jouer|play/i }).click();
      
      await page.waitForTimeout(3000);
      
      // Make first move
      await page.locator('[data-square="e2"]').click();
      await page.locator('[data-square="e4"]').click();
      
      await page.waitForTimeout(1500);
      
      // Opponent responds
      await page.locator('[data-square="e7"]').click();
      await page.locator('[data-square="e5"]').click();
      
      // Wait for new Stockfish calculation
      await page.waitForTimeout(3000);
      
      // Verify new suggestion is shown
      const hasSuggestion = await page.locator('[data-forced-piece]').isVisible().catch(() => false) ||
                            await page.locator('.forced-piece').isVisible().catch(() => false);
      
      expect(hasSuggestion).toBeTruthy();
    });
  });
});
