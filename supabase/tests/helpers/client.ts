import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';
import {
  TEST_SUPABASE_ANON_KEY,
  TEST_SUPABASE_SERVICE_ROLE_KEY,
  TEST_SUPABASE_URL
} from './env.ts';

export const serviceClient = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export const anonymousClient = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

export function createClientWithToken(accessToken: string): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}
