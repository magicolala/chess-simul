import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { test as base, expect } from '@playwright/test';

type StagingAccount = {
  id: string;
  email: string;
  password: string;
};

type Fixtures = {
  accounts: [StagingAccount, StagingAccount];
};

/**
 * Node-only test fixture: the service-role key is NEVER sent to page.evaluate(),
 * browser storage, any client-side bundle, traces, or logs.
 *
 * This intentionally fails if staging is not explicitly configured. Do not
 * replace failures with test.skip(): production safety depends on these checks.
 */
function requireStagingConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.PLAYWRIGHT_TEST_SUPABASE_URL;
  const serviceRoleKey = process.env.PLAYWRIGHT_TEST_SERVICE_ROLE_KEY;
  const expectedRef = process.env.PLAYWRIGHT_TEST_SUPABASE_REF;

  if (process.env.PLAYWRIGHT_STAGING_CONFIRM !== 'I_ACCEPT_TEST_DATA_CHANGES') {
    throw new Error('Staging account creation requires PLAYWRIGHT_STAGING_CONFIRM.');
  }
  if (!url || !serviceRoleKey || !expectedRef) {
    throw new Error('Missing dedicated staging project credentials.');
  }

  const parsed = new URL(url);
  const ref = parsed.hostname.split('.')[0];
  if (
    parsed.protocol !== 'https:' ||
    !/^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname) ||
    ref !== expectedRef ||
    ref === 'kjgcgnqeyxzivilkiruz'
  ) {
    throw new Error('Refusing to run Playwright mutations against an unverified or production Supabase project.');
  }

  // When Playwright starts Angular locally, ensure its generated client
  // environment cannot silently point at production.
  if (
    !process.env.PLAYWRIGHT_BASE_URL &&
    (process.env.SUPABASE_URL !== url || process.env.SUPABASE_URL_DEV !== url)
  ) {
    throw new Error('The local Angular Supabase URL must match the test project.');
  }

  return { url, serviceRoleKey };
}

export const test = base.extend<Fixtures>({
  accounts: async ({}, use) => {
    const config = requireStagingConfig();
    const admin = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const created: StagingAccount[] = [];

    try {
      for (let i = 0; i < 2; i++) {
        const email = `chess-simul-staging-${randomUUID()}@example.com`;
        const password = `Aa1!${randomBytes(18).toString('base64url')}`;
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });
        if (error || !data.user) {
          throw new Error(`Could not provision staging account: ${error?.message ?? 'unknown'}`);
        }
        created.push({ id: data.user.id, email, password });
      }
      await use(created as [StagingAccount, StagingAccount]);
    } finally {
      for (const account of created) {
        const { error } = await admin.auth.admin.deleteUser(account.id);
        if (error) {
          console.error('A staging test account could not be cleaned up (user id only):', account.id);
        }
      }
    }
  }
});

export { expect };
