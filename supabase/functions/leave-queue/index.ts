import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json().catch(() => ({}));
    const timeControl = typeof body?.time_control === 'string' ? body.time_control.trim() : undefined;

    let query = supabase.from('match_queue').delete().eq('user_id', authData.user.id);

    if (timeControl) {
      query = query.eq('time_control', timeControl);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ removed: true }), { headers: corsHeaders });
  } catch (error) {
    console.error('leave-queue error', error);
    return new Response(JSON.stringify({ error: 'Unable to leave queue' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
