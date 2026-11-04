import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  try {
    const body = await req.json().catch(() => null);
    const gameId = body?.game_id;
    if (typeof gameId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)) {
      return respond(400, { error: 'invalid_payload' });
    }

    const { data: { user }, error: authError } = await createSupabaseClient(req).auth.getUser();
    if (authError || !user) return respond(401, { error: 'unauthorized' });

    const admin = createAdminClient();
    const { data: game, error: gameError } = await admin
      .from('games')
      .select('id,white_id,black_id,status,move_count,updated_at')
      .eq('id', gameId)
      .single();
    if (gameError || !game) return respond(404, { error: 'game_not_found' });
    if (user.id !== game.white_id && user.id !== game.black_id) {
      return respond(403, { error: 'forbidden' });
    }
    if (game.status !== 'active') return respond(200, { timeout: false, status: game.status });

    // The DB rechecks the deadline against its clock under a row lock,
    // so an old timeout request cannot overwrite a concurrently accepted move.
    const { data, error } = await admin.rpc('finalize_game_timeout', {
      p_game_id: gameId,
      p_actor_id: user.id,
      p_expected_ply: game.move_count,
      p_expected_updated_at: game.updated_at
    });
    if (error) {
      console.error('[check-timeout] RPC failed:', error.code, error.message);
      return respond(500, { error: 'timeout_check_failed' });
    }
    const result = data as { ok: boolean; timeout?: boolean; winner_id?: string; status?: string; error?: string };
    if (!result.ok && result.error === 'state_changed') return respond(200, { timeout: false });
    if (!result.ok) return respond(409, { error: result.error ?? 'timeout_check_rejected' });
    return respond(200, {
      timeout: Boolean(result.timeout),
      ...(result.timeout ? { winner_id: result.winner_id, status: result.status } : {})
    });
  } catch (error) {
    console.error('[check-timeout] Unexpected error:', error);
    return respond(500, { error: 'unexpected_error' });
  }
});
