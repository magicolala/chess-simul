import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { Chess } from 'npm:chess.js@1.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';
import { afterMoveClock } from '../_shared/game-clock.ts';

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const isUci = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value);

type PersistResult = { ok: boolean; error?: string; ply?: number };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  try {
    const body = await req.json().catch(() => null);
    const gameId = body?.game_id;
    const uci = body?.uci;
    if (!isUuid(gameId) || !isUci(uci)) {
      return respond(400, { error: 'invalid_payload', message: 'Expected UUID game_id and UCI move.' });
    }

    // Authentication is checked with the caller's JWT, never a client-supplied actor id.
    const caller = createSupabaseClient(req);
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return respond(401, { error: 'unauthorized' });

    const admin = createAdminClient();
    const { data: game, error: loadError } = await admin
      .from('games')
      .select('id, fen, turn, white_id, black_id, status, move_count, clocks, updated_at, created_at')
      .eq('id', gameId)
      .single();

    if (loadError || !game) return respond(404, { error: 'game_not_found' });
    const actorColor = user.id === game.white_id ? 'w' : user.id === game.black_id ? 'b' : null;
    if (!actorColor) return respond(403, { error: 'forbidden' });
    if (game.status !== 'active') return respond(409, { error: 'game_over' });
    if (game.turn !== actorColor) return respond(409, { error: 'not_your_turn' });

    const updatedAt: string = game.updated_at || game.created_at;
    const clock = afterMoveClock(game.clocks, actorColor, updatedAt, Date.now());

    const finalizeTimeout = async () => {
      const { data, error } = await admin.rpc('finalize_game_timeout', {
        p_game_id: gameId,
        p_actor_id: user.id,
        p_expected_ply: game.move_count,
        p_expected_updated_at: game.updated_at
      });
      if (error) throw error;
      return data as { ok: boolean; timeout?: boolean; error?: string };
    };

    if (clock.expired) {
      const result = await finalizeTimeout();
      return respond(409, { error: result.timeout ? 'clock_expired' : 'concurrent_update' });
    }

    let chess: Chess;
    try {
      chess = new Chess(game.fen);
    } catch {
      return respond(409, { error: 'invalid_game_position' });
    }

    let move;
    try {
      move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length === 5 ? uci[4] : undefined
      });
    } catch {
      return respond(400, { error: 'invalid_move' });
    }

    if (!move) return respond(400, { error: 'invalid_move' });
    const isCheckmate = chess.isCheckmate();
    const isDraw = !isCheckmate && chess.isDraw();
    const nextStatus = isCheckmate ? 'checkmate' : isDraw ? 'draw' : 'active';

    // One PostgreSQL transaction locks the game, verifies the expected state,
    // advances the game AND writes the move (or rolls everything back).
    const { data, error } = await admin.rpc('persist_validated_move', {
      p_game_id: gameId,
      p_actor_id: user.id,
      p_expected_ply: game.move_count,
      p_expected_fen: game.fen,
      p_expected_updated_at: game.updated_at,
      p_uci: move.lan,
      p_san: move.san,
      p_next_fen: chess.fen(),
      p_next_turn: chess.turn(),
      p_next_status: nextStatus,
      p_winner_id: isCheckmate ? user.id : null
    });

    if (error) {
      console.error('[submit-move] RPC failed:', error.code, error.message);
      return respond(500, { error: 'move_persistence_failed' });
    }

    const result = data as PersistResult;
    if (!result?.ok) {
      if (result?.error === 'clock_expired') {
        const timeout = await finalizeTimeout();
        return respond(409, {
          error: timeout.timeout ? 'clock_expired' : 'concurrent_update'
        });
      }
      const code = result?.error ?? 'move_rejected';
      const status = code === 'game_not_found' ? 404
        : code === 'forbidden' ? 403
        : code === 'invalid_transition' ? 400 : 409;
      return respond(status, { error: code });
    }

    return respond(200, {
      success: true,
      fen: chess.fen(),
      turn: chess.turn(),
      ply: result.ply,
      san: move.san,
      status: nextStatus,
      isCheckmate,
      isDraw
    });
  } catch (error) {
    console.error('[submit-move] Unexpected error:', error);
    return respond(500, { error: 'unexpected_error' });
  }
});
