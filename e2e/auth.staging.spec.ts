import { test, expect } from './helpers/staging-accounts';
import type { Page } from '@playwright/test';

async function signInViaRealForm(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();

  // The real Angular LoginPageComponent navigates to /settings, not to the
  // old mocked /onboarding or /dashboard routes.
  await expect(page).toHaveURL(/\/settings(?:\?.*)?$/);
}

test.describe('Staging Supabase Auth — real two-user sessions', () => {
  test('signs in a real account and persists access across reloads', async ({ page, accounts }) => {
    await signInViaRealForm(page, accounts[0].email, accounts[0].password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Prêt à jouer/i })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Prêt à jouer/i })).toBeVisible();
  });

  test('isolates two independently authenticated browser contexts', async ({ page, browser, accounts }) => {
    const otherContext = await browser.newContext();
    try {
      const otherPage = await otherContext.newPage();

      await signInViaRealForm(page, accounts[0].email, accounts[0].password);
      await signInViaRealForm(otherPage, accounts[1].email, accounts[1].password);

      await page.goto('/dashboard');
      await otherPage.goto('/dashboard');

      await expect(page.getByRole('heading', { name: /Prêt à jouer/i })).toBeVisible();
      await expect(otherPage.getByRole('heading', { name: /Prêt à jouer/i })).toBeVisible();

      // Different browser contexts must not share cookies or localStorage.
      const firstState = await page.context().storageState();
      const secondState = await otherContext.storageState();
      expect(firstState.origins).not.toEqual(secondState.origins);
    } finally {
      await otherContext.close();
    }
  });
});
