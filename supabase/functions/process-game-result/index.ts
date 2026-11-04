import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const isUuid = (input: unknown): input is string =>
  typeof input === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

type RatingResult = {
  ok: boolean;
  error?: string;
  already_processed?: boolean;
  game_id?: string;
  white_delta?: number;
  black_delta?: number;
  white_elo?: number;
  black_elo?: number;
};

/**
 * Finalize an already completed and server-authorized STANDARD game.
 * A player may request settlement of their own game, but may never submit
 * the outcome, winner, mode or Elo change. The locked DB RPC derives all
 * of these from the persisted game and only executes as service_role.
 *
 * Hydra tournaments use a separate hydra_games ledger and must never be
 * processed here. The caller's JWT is checked both by the gateway
 * (verify_jwt=true) and by auth.getUser().
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  try {
    const input: unknown = await req.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return respond(400, { error: 'invalid_payload' });
    }

    const body = input as Record<string, unknown>;
    if (Object.keys(body).length !== 1 || !isUuid(body.game_id)) {
      return respond(400, {
        error: 'invalid_payload',
        message: 'Only game_id is accepted. The server determines the outcome.'
      });
    }

    const caller = createSupabaseClient(req);
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return respond(401, { error: 'unauthorized' });

    const admin = createAdminClient();
    const { data: game, error: loadError } = await admin
      .from('games')
      .select('id,white_id,black_id')
      .eq('id', body.game_id)
      .maybeSingle();

    if (loadError) {
      console.error('[process-game-result] Could not read game:', loadError.code);
      return respond(500, { error: 'game_read_failed' });
    }
    if (!game) return respond(404, { error: 'game_not_found' });
    if (user.id !== game.white_id && user.id !== game.black_id) {
      return respond(403, { error: 'forbidden' });
    }

    const { data, error } = await admin.rpc('apply_completed_game_rating', {
      p_game_id: body.game_id
    });
    if (error) {
      console.error('[process-game-result] Settlement failed:', error.code);
      return respond(500, { error: 'rating_settlement_failed' });
    }

    const result = data as RatingResult | null;
    if (!result?.ok) {
      const code = result?.error ?? 'rating_rejected';
      return respond(
        code === 'game_not_found' ? 404 :
        code === 'not_rated' ? 403 :
        code === 'invalid_game_id' ? 400 : 409,
        { error: code }
      );
    }
    return respond(200, {
      success: true,
      game_id: result.game_id ?? body.game_id,
      already_processed: Boolean(result.already_processed),
      ...(result.already_processed ? {} : {
        white_elo_change: result.white_delta,
        black_elo_change: result.black_delta,
        new_white_elo: result.white_elo,
        new_black_elo: result.black_elo
      })
    });
  } catch (error) {
    console.error('[process-game-result] Unexpected error:', error);
    return respond(500, { error: 'unexpected_error' });
  }
});
