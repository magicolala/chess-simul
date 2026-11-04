import { test, expect } from '@playwright/test';

/**
 * Deterministic public-route smoke tests.
 *
 * These cases intentionally do not create users or use Supabase credentials.
 * Protected multiplayer flows still live in the full staging E2E suite.
 * Each assertion follows the real Angular routes and form controls.
 */
test.describe('Public Chess Simul smoke', () => {
  test('landing exposes the game and routes to the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /L'ÉCHECS/i })).toBeVisible();
    await expect(page.getByText('Multijoueur Premium')).toBeVisible();

    await page.getByRole('button', { name: 'Connexion', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
  });

  test('registration validates fields without creating a real user', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Rejoindre', exact: true }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible();

    const email = page.getByLabel('Email');
    const password = page.getByLabel('Mot de passe');
    const submit = page.getByRole('button', { name: "S'inscrire" });

    await expect(submit).toBeDisabled();
    await email.fill('not-an-email');
    await password.fill('ValidPass123!');
    await expect(submit).toBeDisabled();

    await email.fill('smoke@example.com');
    await expect(submit).toBeEnabled();

    // Do not submit: this test intentionally does not modify Supabase.
    await page.getByRole('link', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('public memory mode offers solo and duel play', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Lancer le défi/i }).click();

    await expect(page).toHaveURL(/\/memory$/);
    await expect(page.getByRole('heading', { name: 'Solo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Duel (Hotseat)' })).toBeVisible();

    await page.getByRole('button', { name: 'Jouer en Solo' }).click();
    await expect(page.locator('app-chess-board')).toBeVisible();
  });

  test('dashboard requires an authenticated session', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  });
});
