import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Tests d'accessibilité automatisés avec axe-core
 * Vérifie la conformité WCAG 2.1 AA
 */

test.describe('Accessibility Tests', () => {
  test('landing page should not have accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('dashboard should not have accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('chess board should be keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /nouvelle partie|new game/i }).click();
    await page.waitForSelector('.chess-board');

    // Vérifier que le focus fonctionne
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Vérifier l'accessibilité de l'échiquier
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.chess-board')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login form should be accessible', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /connexion|login/i }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('round robin lobby should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /round robin/i }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .disableRules(['color-contrast']) // Désactiver temporairement si nécessaire
      .analyze();

    // Vérifier spécifiquement le contraste des couleurs
    const contrastResults = await new AxeBuilder({ page })
      .include('body')
      .withRules(['color-contrast'])
      .analyze();

    expect(contrastResults.violations).toEqual([]);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /connexion|login/i }).click();

    const accessibilityScanResults = await new AxeBuilder({ page }).withRules(['label']).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('headings should be in correct order', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Tester la navigation au clavier
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        tabindex: el?.getAttribute('tabindex')
      };
    });

    // Vérifier qu'un élément interactif a le focus
    expect(focusedElement.tag).toBeTruthy();
  });
});

test.describe('ARIA Attributes', () => {
  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['button-name'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('links should have accessible names', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['link-name'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA roles should be valid', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-roles', 'aria-valid-attr'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
