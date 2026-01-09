import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient(req);

    const { game_id } = await req.json();

    if (!game_id) {
      return respond(400, { error: 'invalid_payload', message: 'game_id is required' });
    }

    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        return respond(401, { error: 'unauthorized', message: 'Auth failed' });
    }

    // Use admin client to fetch and update to ensure we see fresh state and bypass potential RLS hiccups on update
    // though RLS should allow participants to update. Admin is safer for state transitions.
    const adminClient = createAdminClient();

    const { data: game, error: gameError } = await adminClient
        .from('games')
        .select('id, white_id, black_id, status, turn')
        .eq('id', game_id)
        .single();

    if (gameError || !game) {
        return respond(404, { error: 'game_not_found', message: 'Game not found' });
    }

    if (game.status !== 'active') {
        return respond(400, { error: 'game_not_active', message: 'Game is not active' });
    }

    const userColor = user.id === game.white_id ? 'w' : user.id === game.black_id ? 'b' : null;
    if (!userColor) {
        return respond(403, { error: 'forbidden', message: 'You are not a participant' });
    }

    // Opponent wins
    const winnerId = userColor === 'w' ? game.black_id : game.white_id;

    const { error: updateError } = await adminClient
        .from('games')
        .update({
            status: 'resigned',
            winner_id: winnerId,
            updated_at: new Date().toISOString()
        })
        .eq('id', game_id);

    if (updateError) {
        return respond(500, { error: 'update_failed', message: updateError.message });
    }

    return respond(200, { success: true });

  } catch (error) {
    return respond(500, { error: 'unexpected_error', message: (error as Error).message });
  }
});

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
