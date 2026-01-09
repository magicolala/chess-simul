
import { Page, expect } from '@playwright/test';
import { createTestUser, TestUser } from './test-data';

export async function registerAndLogin(page: Page): Promise<TestUser> {
    const user = createTestUser();

    await page.goto('/');
    
    // Click "Commencer Gratuitement" in Hero or "Rejoindre" in Nav
    await page.getByRole('button', { name: /rejoindre|commencer/i }).first().click();

    // Fill Registration Form
    await page.getByLabel(/nom|name/i).fill(user.name);
    await page.getByLabel(/email/i).fill(user.email);
    // Use first because there might be multiple password fields (login form hidden/modal?)
    // But usually in the modal there is only one.
    await page.getByLabel(/mot de passe|password/i).fill(user.password);

    // Submit
    await page.getByRole('button', { name: /commencer|création/i }).click();

    // Verify Email
    await expect(page.getByText(/vérifi.*email/i)).toBeVisible();
    await page.getByPlaceholder(/code/i).fill('1234');
    await page.getByRole('button', { name: /vérifier|verify/i }).click();

    // Onboarding
    // Check if we are on onboarding
    await expect(page).toHaveURL(/onboarding/);
    await page.getByLabel(/nom|name/i).fill(user.name);
    await page.getByRole('button', { name: /continuer|continue/i }).click();

    // Expect Dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(user.name)).toBeVisible();

    return user;
}
