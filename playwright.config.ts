import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E de chess-simul
 */
export default defineConfig({
    testDir: './e2e',

    /* Timeout maximum par test */
    timeout: 30 * 1000,

    /* Timeout pour chaque assertion */
    expect: {
        timeout: 5000,
        toHaveScreenshot: {
            maxDiffPixels: 100,
            threshold: 0.2,
            animations: 'disabled'
        }
    },

    /* Exécuter les tests en parallèle */
    fullyParallel: true,

    /* Échouer le build sur CI si vous avez laissé test.only */
    forbidOnly: !!process.env.CI,

    /* Retry sur CI uniquement */
    retries: process.env.CI ? 2 : 0,

    /* Nombre de workers */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter */
    reporter: [
        ['html'],
        ['list']
    ],

    /* Configuration partagée pour tous les projets */
    use: {
        /* URL de base */
        baseURL: 'http://localhost:3000',

        /* Collecter des traces en cas d'échec */
        trace: 'on-first-retry',

        /* Screenshots en cas d'échec */
        screenshot: 'only-on-failure',

        /* Vidéos en cas d'échec */
        video: 'retain-on-failure'
    },

    /* Configuration des projets de test */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },

        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },

        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },

        /* Tests sur mobile */
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] }
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] }
        }
    ],

    /* Démarrer le serveur de dev avant les tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 300 * 1000
    }
});
