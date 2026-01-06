import { test, expect, chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createTestUser, generateInviteCode, waitForAnimation } from './helpers/test-data';

/**
 * Tests E2E pour le flux Round Robin
 * Ces tests utilisent plusieurs contextes de navigateur pour simuler plusieurs utilisateurs
 */

test.describe('Round Robin Flow', () => {
    let hostBrowser: Browser;
    let guestBrowser: Browser;
    let hostContext: BrowserContext;
    let guestContext: BrowserContext;
    let hostPage: Page;
    let guestPage: Page;
    let inviteLink: string;

    test.beforeAll(async () => {
        // Créer deux navigateurs séparés pour simuler deux utilisateurs
        hostBrowser = await chromium.launch();
        guestBrowser = await chromium.launch();
    });

    test.afterAll(async () => {
        await hostBrowser.close();
        await guestBrowser.close();
    });

    test.beforeEach(async () => {
        hostContext = await hostBrowser.newContext();
        guestContext = await guestBrowser.newContext();
        hostPage = await hostContext.newPage();
        guestPage = await guestContext.newPage();
    });

    test.afterEach(async () => {
        await hostContext.close();
        await guestContext.close();
    });

    test('should create Round Robin session and generate invite link', async () => {
        await hostPage.goto('/dashboard');

        // Naviguer vers Round Robin
        await hostPage.getByRole('link', { name: /round robin|simultanée/i }).click();

        // Créer une session
        await hostPage.getByRole('button', { name: /créer.*session|create session/i }).click();

        await waitForAnimation();

        // Vérifier que la session est créée
        await expect(hostPage.getByText(/session créée|session created/i)).toBeVisible();

        // Récupérer le lien d'invitation
        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        expect(inviteLink).toContain('rr_invite=');
    });

    test('should join Round Robin session via invite link', async () => {
        // L'hôte crée une session
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        // Récupérer le lien d'invitation
        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        // L'invité ouvre le lien
        await guestPage.goto(inviteLink);

        // Vérifier que l'invité voit la session
        await expect(guestPage.getByText(/rejoindre|join/i)).toBeVisible();

        // Rejoindre la session
        await guestPage.getByRole('button', { name: /rejoindre|join/i }).click();

        await waitForAnimation();

        // Vérifier que l'invité est dans le lobby
        await expect(guestPage.getByText(/participants|players/i)).toBeVisible();
    });

    test('should allow guest mode for anonymous users', async () => {
        // L'hôte crée une session
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        // L'invité (non connecté) ouvre le lien
        await guestPage.goto(inviteLink);

        // Activer le mode invité
        await guestPage.getByLabel(/mode.*invité|guest mode/i).check();

        // Rejoindre
        await guestPage.getByRole('button', { name: /rejoindre|join/i }).click();

        await waitForAnimation();

        // Vérifier que l'invité est dans le lobby en mode anonyme
        await expect(guestPage.getByText(/invité|guest/i)).toBeVisible();
    });

    test('should start Round Robin tournament with multiple players', async () => {
        // L'hôte crée une session et attend des joueurs
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        // L'invité rejoint
        await guestPage.goto(inviteLink);
        await guestPage.getByRole('button', { name: /rejoindre|join/i }).click();
        await waitForAnimation();

        // L'hôte démarre le tournoi
        await hostPage.getByRole('button', { name: /démarrer|start/i }).click();

        await waitForAnimation();

        // Vérifier que les parties sont créées
        await expect(hostPage.getByText(/parties|games/i)).toBeVisible();
        await expect(guestPage.getByText(/parties|games/i)).toBeVisible();
    });

    test('should display all Round Robin games', async () => {
        // Créer et démarrer une session avec plusieurs joueurs
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        await guestPage.goto(inviteLink);
        await guestPage.getByRole('button', { name: /rejoindre|join/i }).click();
        await waitForAnimation();

        await hostPage.getByRole('button', { name: /démarrer|start/i }).click();
        await waitForAnimation();

        // Vérifier que toutes les parties sont affichées
        const gameCards = await hostPage.locator('[data-testid="game-card"]').count();
        expect(gameCards).toBeGreaterThan(0);
    });

    test('should play a Round Robin game', async () => {
        // Créer et démarrer une session
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        await guestPage.goto(inviteLink);
        await guestPage.getByRole('button', { name: /rejoindre|join/i }).click();
        await waitForAnimation();

        await hostPage.getByRole('button', { name: /démarrer|start/i }).click();
        await waitForAnimation();

        // Cliquer sur une partie pour la jouer
        await hostPage.locator('[data-testid="game-card"]').first().click();

        await waitForAnimation();

        // Vérifier que l'échiquier est affiché
        await expect(hostPage.locator('.chess-board')).toBeVisible();

        // Jouer un coup
        await hostPage.locator('[data-square="e2"]').click();
        await hostPage.locator('[data-square="e4"]').click();

        await waitForAnimation();

        // Vérifier que le coup est synchronisé pour l'autre joueur
        await guestPage.locator('[data-testid="game-card"]').first().click();
        await expect(guestPage.locator('[data-square="e4"]')).toContainText(/♙|P/);
    });

    test('should show tournament standings', async () => {
        // Créer et démarrer une session
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        const inviteLinkElement = await hostPage.locator('[data-testid="invite-link"]');
        inviteLink = (await inviteLinkElement.textContent()) || '';

        await guestPage.goto(inviteLink);
        await guestPage.getByRole('button', { name: /rejoindre|join/i }).click();
        await waitForAnimation();

        await hostPage.getByRole('button', { name: /démarrer|start/i }).click();
        await waitForAnimation();

        // Cliquer sur le classement
        await hostPage.getByRole('tab', { name: /classement|standings/i }).click();

        // Vérifier que le classement est affiché
        await expect(hostPage.getByText(/points|score/i)).toBeVisible();
        await expect(hostPage.locator('[data-testid="player-row"]').count()).resolves.toBeGreaterThan(0);
    });

    test('should copy invite link to clipboard', async () => {
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        // Cliquer sur le bouton de copie
        await hostPage.getByRole('button', { name: /copier|copy/i }).click();

        // Vérifier le message de confirmation
        await expect(hostPage.getByText(/copié|copied/i)).toBeVisible();
    });

    test('should handle session not found error', async () => {
        await guestPage.goto('/?rr_invite=INVALID_CODE');

        // Vérifier le message d'erreur
        await expect(guestPage.getByText(/introuvable|not found/i)).toBeVisible();
    });

    test('should prevent starting with insufficient players', async () => {
        await hostPage.goto('/dashboard');
        await hostPage.getByRole('link', { name: /round robin/i }).click();
        await hostPage.getByRole('button', { name: /créer.*session/i }).click();
        await waitForAnimation();

        // Essayer de démarrer sans assez de joueurs
        const startButton = hostPage.getByRole('button', { name: /démarrer|start/i });

        // Le bouton devrait être désactivé ou afficher une erreur
        const isDisabled = await startButton.isDisabled();
        expect(isDisabled).toBe(true);
    });
});
