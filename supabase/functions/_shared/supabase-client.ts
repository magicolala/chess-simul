import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

export function createSupabaseClient(request: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: request.headers.get('Authorization') ?? '' }
    }
  });
}
