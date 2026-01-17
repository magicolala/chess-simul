import { test, expect } from '@playwright/test';
import { waitForAnimation } from './helpers/test-data';

/**
 * Tests de régression visuelle avec Playwright
 * Compare les screenshots avec les baselines pour détecter les changements visuels non intentionnels
 */

test.describe('Visual Regression Tests', () => {
  test('landing page should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('dashboard should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixels: 150
    });
  });

  test('chess board initial position should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
    await page.waitForSelector('.chess-board');
    await waitForAnimation();

    await expect(page.locator('.chess-board')).toHaveScreenshot('chess-board-initial.png', {
      maxDiffPixelRatio: 0.01
    });
  });

  test('chess board after e4 should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
    await page.waitForSelector('.chess-board');

    // Jouer e4
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();
    await waitForAnimation();

    await expect(page.locator('.chess-board')).toHaveScreenshot('chess-board-after-e4.png', {
      maxDiffPixelRatio: 0.01
    });
  });

  test('round robin lobby should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /round robin/i }).click();
    await page.getByRole('button', { name: /créer/i }).click();
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('round-robin-lobby.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });

  test('login modal should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /connexion|login/i }).click();
    await waitForAnimation();

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('login-modal.png', {
      maxDiffPixels: 50
    });
  });

  test('register modal should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /s\'inscrire|register/i }).click();
    await waitForAnimation();

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('register-modal.png', {
      maxDiffPixels: 50
    });
  });

  test('game over modal should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
    await page.waitForSelector('.chess-board');

    // Abandonner pour afficher le modal
    await page.getByRole('button', { name: /abandonner|resign/i }).click();
    await page.getByRole('button', { name: /confirmer|confirm/i }).click();
    await waitForAnimation();

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('game-over-modal.png', {
      maxDiffPixels: 100
    });
  });

  test('settings panel should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /paramètres|settings/i }).click();
    await waitForAnimation();

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('settings-panel.png', {
      maxDiffPixels: 100
    });
  });

  test('multiplayer lobby should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /multijoueur|multiplayer/i }).click();
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('multiplayer-lobby.png', {
      fullPage: true,
      maxDiffPixels: 150
    });
  });

  test('analysis board should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /analyse|analysis/i }).click();
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('analysis-board.png', {
      fullPage: true,
      maxDiffPixels: 150
    });
  });
});

test.describe('Visual Regression - Responsive', () => {
  test('landing page mobile should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('landing-page-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('chess board mobile should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
    await page.waitForSelector('.chess-board');
    await waitForAnimation();

    await expect(page.locator('.chess-board')).toHaveScreenshot('chess-board-mobile.png', {
      maxDiffPixelRatio: 0.02
    });
  });

  test('dashboard tablet should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.use({ colorScheme: 'dark' });

  test('landing page dark mode should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForAnimation();

    await expect(page).toHaveScreenshot('landing-page-dark.png', {
      fullPage: true,
      maxDiffPixels: 150
    });
  });

  test('chess board dark mode should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
    await page.waitForSelector('.chess-board');
    await waitForAnimation();

    await expect(page.locator('.chess-board')).toHaveScreenshot('chess-board-dark.png', {
      maxDiffPixelRatio: 0.02
    });
  });
});
