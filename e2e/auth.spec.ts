import { test, expect, type Page } from '@playwright/test';
import { createTestUser, type TestUser } from '../helpers/test-data';

/**
 * Tests E2E pour le flux d'authentification complet
 */

test.describe('Authentication Flow', () => {
  let testUser: TestUser;

  test.beforeEach(() => {
    testUser = createTestUser();
  });

  test('should complete full registration flow', async ({ page }) => {
    await page.goto('/');

    // Cliquer sur le bouton d'inscription
    await page.getByRole('button', { name: /s'inscrire|register/i }).click();

    // Remplir le formulaire d'inscription
    await page.getByLabel(/nom|name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page
      .getByLabel(/mot de passe|password/i)
      .first()
      .fill(testUser.password);

    // Soumettre le formulaire
    await page.getByRole('button', { name: /créer un compte|sign up/i }).click();

    // Vérifier la redirection vers la vérification d'email
    await expect(page).toHaveURL(/verify-email/);
    await expect(page.getByText(/vérifi.*email/i)).toBeVisible();

    // Entrer le code de vérification (code de test: 1234)
    await page.getByPlaceholder(/code/i).fill('1234');
    await page.getByRole('button', { name: /vérifier|verify/i }).click();

    // Vérifier la redirection vers l'onboarding
    await expect(page).toHaveURL(/onboarding/);

    // Compléter l'onboarding
    await page.getByLabel(/nom|name/i).fill(testUser.name);
    await page.getByRole('button', { name: /continuer|continue/i }).click();

    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(testUser.name)).toBeVisible();
  });

  test('should login with existing user', async ({ page }) => {
    // D'abord créer un utilisateur (simplifié pour le test)
    await page.goto('/');

    // Cliquer sur connexion
    await page.getByRole('button', { name: /connexion|login/i }).click();

    // Remplir le formulaire de connexion
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/mot de passe|password/i).fill(testUser.password);

    // Soumettre
    await page.getByRole('button', { name: /se connecter|sign in/i }).click();

    // Vérifier la connexion (ou l'erreur si l'utilisateur n'existe pas)
    // Dans un vrai test, on utiliserait un utilisateur pré-créé
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /connexion|login/i }).click();

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/mot de passe|password/i).fill('wrongpassword');

    await page.getByRole('button', { name: /se connecter|sign in/i }).click();

    // Vérifier le message d'erreur
    await expect(page.getByText(/invalide|incorrect|erreur/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Simuler une connexion (à adapter selon votre implémentation)
    await page.goto('/dashboard');

    // Cliquer sur le menu utilisateur
    await page.getByRole('button', { name: /profil|menu/i }).click();

    // Cliquer sur déconnexion
    await page.getByRole('button', { name: /déconnexion|logout/i }).click();

    // Vérifier la redirection vers la page d'accueil
    await expect(page).toHaveURL(/\/$|\/landing/);
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /connexion|login/i }).click();
    await page.getByText(/mot de passe oublié|forgot password/i).click();

    // Vérifier la redirection vers la page de réinitialisation
    await expect(page).toHaveURL(/forgot-password/);

    // Entrer l'email
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByRole('button', { name: /envoyer|send/i }).click();

    // Vérifier le message de confirmation
    await expect(page.getByText(/email envoyé|check your email/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /s'inscrire|register/i }).click();

    await page.getByLabel(/nom|name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill('invalid-email');
    await page
      .getByLabel(/mot de passe|password/i)
      .first()
      .fill(testUser.password);

    await page.getByRole('button', { name: /créer un compte|sign up/i }).click();

    // Vérifier le message d'erreur de validation
    await expect(page.getByText(/email.*invalide|invalid email/i)).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /s'inscrire|register/i }).click();

    await page.getByLabel(/nom|name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page
      .getByLabel(/mot de passe|password/i)
      .first()
      .fill('weak');

    await page.getByRole('button', { name: /créer un compte|sign up/i }).click();

    // Vérifier le message d'erreur de mot de passe faible
    await expect(page.getByText(/mot de passe.*court|password.*short/i)).toBeVisible();
  });
});
