import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';
import { serviceClient, anonymousClient, createClientWithToken } from './client.ts';

const PASSWORD_TEMPLATE = 'TestPass#2024-';

export type TestUser = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  client: SupabaseClient;
};

export async function createTestUser(prefix = 'test-user'): Promise<TestUser> {
  const randomSuffix = crypto.randomUUID().split('-')[0];
  const email = `${prefix}-${randomSuffix}@example.com`;
  const password = `${PASSWORD_TEMPLATE}${randomSuffix}`;

  const { data: user, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: 'integration-test' }
  });

  assert(
    !createError && user,
    `Unable to create test user: ${createError?.message ?? 'unknown error'}`
  );

  await serviceClient.from('profiles').upsert(
    {
      id: user.id,
      username: email
    },
    { onConflict: 'id', ignoreDuplicates: false }
  );

  const { data: sessionData, error: signInError } = await anonymousClient.auth.signInWithPassword({
    email,
    password
  });

  assert(
    !signInError && sessionData.session,
    `Unable to sign in test user: ${signInError?.message ?? 'unknown error'}`
  );

  const accessToken = sessionData.session.access_token;
  const client = createClientWithToken(accessToken);

  return {
    id: user.id,
    email,
    password,
    accessToken,
    client
  };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await serviceClient.from('profiles').delete().eq('id', userId);
  await serviceClient.auth.admin.deleteUser(userId);
}
