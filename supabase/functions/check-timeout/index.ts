import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/cors.ts';

type CheckTimeoutBody = {
  game_id?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient(req);

    const payload = (await req.json().catch(() => ({}))) as CheckTimeoutBody;
    const gameId = payload.game_id?.trim();

    if (!gameId) {
      return respond(400, {
        error: 'invalid_payload',
        message: 'game_id is required'
      });
    }

    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return respond(401, {
        error: 'unauthorized',
        message: 'Authentication failed'
      });
    }

    const adminClient = createAdminClient();

    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('id, white_id, black_id, status, turn, clocks, updated_at, created_at')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return respond(404, {
        error: 'game_not_found',
        message: gameError?.message ?? 'Game not found'
      });
    }

    // Check user is a participant
    const userColor = user.id === game.white_id ? 'w' : user.id === game.black_id ? 'b' : null;
    if (!userColor) {
      return respond(403, {
        error: 'forbidden',
        message: 'You are not a participant in this game'
      });
    }

    if (game.status !== 'active') {
      return respond(200, {
        timeout: false,
        message: 'Game is not active'
      });
    }

    // Calculate current time for the active player
    const clocks = game.clocks as { white: number; black: number } | null;
    if (!clocks) {
      return respond(200, { timeout: false });
    }

    const activeColor = game.turn === 'w' ? 'white' : 'black';
    const lastUpdate = new Date(game.updated_at || game.created_at).getTime();
    const elapsed = Date.now() - lastUpdate;
    const currentTime = clocks[activeColor] - elapsed;

    if (currentTime <= 0) {
      // TIMEOUT detected!
      const winnerId = activeColor === 'white' ? game.black_id : game.white_id;
      const gameStatus = activeColor === 'white' ? 'black_won' : 'white_won';

      const { error: updateError } = await adminClient
        .from('games')
        .update({
          status: gameStatus,
          winner_id: winnerId,
          updated_at: new Date().toISOString(),
          clocks: { ...clocks, [activeColor]: 0 }
        })
        .eq('id', gameId)
        .eq('status', 'active'); // Only update if still active (avoid race conditions)

      if (updateError) {
        console.error('[CheckTimeout] Update error:', updateError);
        return respond(500, {
          error: 'update_failed',
          message: updateError.message
        });
      }

      console.log(`[CheckTimeout] ⏰ Timeout detected for ${activeColor}. Winner: ${winnerId}`);
      return respond(200, {
        timeout: true,
        winner_id: winnerId,
        status: gameStatus
      });
    }

    return respond(200, { timeout: false });

  } catch (error) {
    console.error('[CheckTimeout] Unexpected error:', error);
    return respond(500, {
      error: 'unexpected_error',
      message: (error as Error)?.message ?? 'Unexpected error'
    });
  }
});

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
