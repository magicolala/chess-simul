import { assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createSupabaseClient } from '../functions/_shared/supabase-client.ts';

Deno.test('createSupabaseClient fails when required env vars are missing', () => {
  const prevUrl = Deno.env.get('SUPABASE_URL');
  const prevKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  Deno.env.delete('SUPABASE_URL');
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');

  try {
    assertThrows(
      () => createSupabaseClient(new Request('https://example.com')),
      Error,
      'Missing Supabase environment variables'
    );
  } finally {
    if (prevUrl) {
      Deno.env.set('SUPABASE_URL', prevUrl);
    } else {
      Deno.env.delete('SUPABASE_URL');
    }

    if (prevKey) {
      Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', prevKey);
    } else {
      Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
    }
  }
});
