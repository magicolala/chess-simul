import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Chess } from 'npm:chess.js@1.0.0';
import { corsHeaders } from '../_shared/cors.ts';

type SubmitMoveBody = {
  game_id?: string;
  uci?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respond(401, { error: 'missing_auth', message: 'Authorization header is required.' });
    }

    const payload = (await req.json().catch(() => ({}))) as SubmitMoveBody;
    const gameId = payload.game_id?.trim();
    const rawUci = payload.uci?.trim();

    if (!gameId || !rawUci) {
      return respond(400, { error: 'invalid_payload', message: 'Both game_id and uci are required.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return respond(401, { error: 'unauthorized', message: authError?.message ?? 'User not found.' });
    }

    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('id, fen, turn_color, white_id, black_id, status, move_count')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return respond(404, { error: 'game_not_found', message: gameError?.message ?? 'Game not found.' });
    }

    if (game.status !== 'playing' && game.status !== 'waiting') {
      return respond(400, { error: 'game_not_active', message: 'Game is not accepting moves.' });
    }

    const expectedPlayerId = game.turn_color === 'white' ? game.white_id : game.black_id;
    if (user.id !== expectedPlayerId) {
      return respond(403, { error: 'not_players_turn', message: 'It is not your turn to move.' });
    }

    const normalizedUci = rawUci.toLowerCase();
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalizedUci)) {
      return respond(400, { error: 'invalid_uci', message: 'UCI must look like e2e4 or e7e8q.' });
    }

    let chess: Chess;
    try {
      chess = new Chess(game.fen);
    } catch {
      return respond(500, { error: 'invalid_fen', message: 'Stored game FEN could not be loaded.' });
    }

    const fenTurn = chess.turn() === 'w' ? 'white' : 'black';
    if (fenTurn !== game.turn_color) {
      return respond(409, { error: 'turn_mismatch', message: 'Game state is out of sync; please retry.' });
    }

    const move = chess.move({
      from: normalizedUci.slice(0, 2),
      to: normalizedUci.slice(2, 4),
      promotion: normalizedUci.length > 4 ? normalizedUci[4] : undefined
    });

    if (!move) {
      return respond(400, { error: 'illegal_move', message: 'The move is not legal in this position.' });
    }

    const newFen = chess.fen();
    const nextTurnColor = chess.turn() === 'w' ? 'white' : 'black';

    const { data: latestMove, error: lastMoveError } = await supabaseClient
      .from('moves')
      .select('ply')
      .eq('game_id', gameId)
      .order('ply', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMoveError) {
      return respond(500, { error: 'moves_fetch_failed', message: lastMoveError.message });
    }

    const currentMoveCount = Math.max(game.move_count ?? 0, latestMove?.ply ?? 0);
    const nextPly = currentMoveCount + 1;
    const now = new Date().toISOString();

    const { error: insertError } = await supabaseClient.from('moves').insert({
      game_id: gameId,
      ply: nextPly,
      uci: normalizedUci,
      san: move.san,
      fen: newFen,
      player_id: user.id
    });

    if (insertError) {
      return respond(500, { error: 'move_persist_failed', message: insertError.message });
    }

    const { data: updatedGame, error: updateError } = await supabaseClient
      .from('games')
      .update({
        fen: newFen,
        turn_color: nextTurnColor,
        last_move_uci: normalizedUci,
        move_count: nextPly,
        last_move_at: now,
        updated_at: now
      })
      .eq('id', gameId)
      .eq('move_count', currentMoveCount)
      .select('id')
      .maybeSingle();

    if (updateError) {
      return respond(500, { error: 'game_update_failed', message: updateError.message });
    }

    if (!updatedGame) {
      return respond(409, { error: 'concurrent_update', message: 'Game changed before the update was applied.' });
    }

    return respond(200, {
      success: true,
      fen: newFen,
      turn: nextTurnColor,
      ply: nextPly,
      san: move.san
    });
  } catch (error) {
    console.error('submit-move unexpected error', error);
    return respond(500, { error: 'unexpected_error', message: (error as Error)?.message ?? 'Unexpected error' });
  }
});

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
