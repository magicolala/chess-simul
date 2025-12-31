import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

function readEnv(key: string): string {
  const value = Deno.env.get(key);
  assert(value, `Environment variable ${key} is required for Supabase integration tests`);
  return value;
}

export const TEST_SUPABASE_URL = readEnv('SUPABASE_TEST_URL');
export const TEST_SUPABASE_ANON_KEY = readEnv('SUPABASE_TEST_ANON_KEY');
export const TEST_SUPABASE_SERVICE_ROLE_KEY = readEnv('SUPABASE_TEST_SERVICE_ROLE_KEY');
