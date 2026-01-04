import { test, expect } from '@playwright/test';
import { gameConfigs, waitForAnimation } from '../helpers/test-data';

/**
 * Tests E2E pour les parties locales (PvP local)
 */

test.describe('Local Game Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
    });

    test('should create and start a local game', async ({ page }) => {
        // Cliquer sur "Nouvelle partie"
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();

        // Sélectionner le mode local
        await page.getByText(/local|pvp/i).click();

        // Configurer le temps
        await page.getByLabel(/temps|time/i).selectOption('10');
        await page.getByLabel(/incrément|increment/i).selectOption('5');

        // Démarrer la partie
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Vérifier que l'échiquier est affiché
        await expect(page.locator('.chess-board')).toBeVisible();

        // Vérifier que les horloges sont affichées
        await expect(page.getByText(/10:00/)).toBeVisible();
    });

    test('should make valid moves', async ({ page }) => {
        // Créer une partie rapide
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        await waitForAnimation();

        // Jouer e4
        await page.locator('[data-square="e2"]').click();
        await page.locator('[data-square="e4"]').click();

        await waitForAnimation();

        // Vérifier que le coup a été joué
        await expect(page.locator('[data-square="e4"]')).toContainText(/♙|P/);

        // Jouer e5 pour les noirs
        await page.locator('[data-square="e7"]').click();
        await page.locator('[data-square="e5"]').click();

        await waitForAnimation();

        // Vérifier que le coup a été joué
        await expect(page.locator('[data-square="e5"]')).toContainText(/♟|p/);
    });

    test('should reject invalid moves', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        await waitForAnimation();

        // Essayer de jouer un coup illégal (e2 vers e5)
        await page.locator('[data-square="e2"]').click();
        await page.locator('[data-square="e5"]').click();

        // Vérifier que la pièce est toujours sur e2
        await expect(page.locator('[data-square="e2"]')).toContainText(/♙|P/);
        await expect(page.locator('[data-square="e5"]')).not.toContainText(/♙|P/);
    });

    test('should update timers during game', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Attendre quelques secondes
        await page.waitForTimeout(3000);

        // Vérifier que le temps a diminué (ne devrait plus être 10:00)
        const whiteTime = await page.locator('.white-clock').textContent();
        expect(whiteTime).not.toBe('10:00');
    });

    test('should allow resignation', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Cliquer sur abandonner
        await page.getByRole('button', { name: /abandonner|resign/i }).click();

        // Confirmer l'abandon
        await page.getByRole('button', { name: /confirmer|confirm/i }).click();

        // Vérifier le message de fin de partie
        await expect(page.getByText(/partie terminée|game over/i)).toBeVisible();
    });

    test('should offer and accept draw', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Offrir une nulle
        await page.getByRole('button', { name: /nulle|draw/i }).click();

        // Vérifier que l'offre est affichée
        await expect(page.getByText(/offre.*nulle|draw offer/i)).toBeVisible();

        // Accepter la nulle
        await page.getByRole('button', { name: /accepter|accept/i }).click();

        // Vérifier le résultat
        await expect(page.getByText(/partie nulle|draw/i)).toBeVisible();
    });

    test('should navigate through move history', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Jouer quelques coups
        await page.locator('[data-square="e2"]').click();
        await page.locator('[data-square="e4"]').click();
        await waitForAnimation();

        await page.locator('[data-square="e7"]').click();
        await page.locator('[data-square="e5"]').click();
        await waitForAnimation();

        // Naviguer vers le début
        await page.getByRole('button', { name: /début|start/i }).click();

        // Vérifier que l'échiquier est à la position de départ
        await expect(page.locator('[data-square="e4"]')).not.toContainText(/♙|P/);

        // Naviguer vers la fin
        await page.getByRole('button', { name: /fin|end/i }).click();

        // Vérifier que les coups sont affichés
        await expect(page.locator('[data-square="e4"]')).toContainText(/♙|P/);
        await expect(page.locator('[data-square="e5"]')).toContainText(/♟|p/);
    });

    test('should flip board', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Cliquer sur le bouton de retournement
        await page.getByRole('button', { name: /retourner|flip/i }).click();

        // Vérifier que l'échiquier est retourné (a8 en bas à gauche au lieu de a1)
        const boardOrientation = await page.locator('.chess-board').getAttribute('data-orientation');
        expect(boardOrientation).toBe('black');
    });

    test('should show game over modal on checkmate', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Jouer le mat du berger (Fool's mate)
        await page.locator('[data-square="f2"]').click();
        await page.locator('[data-square="f3"]').click();
        await waitForAnimation();

        await page.locator('[data-square="e7"]').click();
        await page.locator('[data-square="e5"]').click();
        await waitForAnimation();

        await page.locator('[data-square="g2"]').click();
        await page.locator('[data-square="g4"]').click();
        await waitForAnimation();

        await page.locator('[data-square="d8"]').click();
        await page.locator('[data-square="h4"]').click();
        await waitForAnimation();

        // Vérifier le modal de fin de partie
        await expect(page.getByText(/échec et mat|checkmate/i)).toBeVisible();
        await expect(page.getByText(/les noirs gagnent|black wins/i)).toBeVisible();
    });

    test('should analyze game after completion', async ({ page }) => {
        await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
        await page.getByRole('button', { name: /démarrer|start/i }).click();

        // Abandonner rapidement pour terminer la partie
        await page.getByRole('button', { name: /abandonner|resign/i }).click();
        await page.getByRole('button', { name: /confirmer|confirm/i }).click();

        // Cliquer sur analyser
        await page.getByRole('button', { name: /analyser|analyze/i }).click();

        // Vérifier la redirection vers l'analyse
        await expect(page).toHaveURL(/analysis/);
        await expect(page.locator('.chess-board')).toBeVisible();
    });
});
