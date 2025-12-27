import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { Chess } from 'https://esm.sh/chess.js@1.0.0';

type SubmitMoveRequest = {
  game_id?: string;
  uci?: string;
};

type SubmitMoveResponse = {
  data?: unknown;
  error?: string;
};

const jsonResponse = (payload: SubmitMoveResponse, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Service configuration missing' }, 500);
  }

  let body: SubmitMoveRequest;
  try {
    body = await req.json();
  } catch (_err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { game_id, uci } = body ?? {};
  if (!game_id || !uci) {
    return jsonResponse({ error: 'game_id and uci are required' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, fen, turn, status, move_count, white_id, black_id')
    .eq('id', game_id)
    .single();

  if (gameError || !game) {
    return jsonResponse({ error: 'Game not found' }, 404);
  }

  if (game.status !== 'active') {
    return jsonResponse({ error: 'Game is not active' }, 409);
  }

  const expectedPlayer = game.turn === 'w' ? game.white_id : game.black_id;
  if (!expectedPlayer || expectedPlayer !== authData.user.id) {
    return jsonResponse({ error: 'Not your turn for this game' }, 403);
  }

  const { data: lastMove } = await supabase
    .from('moves')
    .select('ply')
    .eq('game_id', game_id)
    .order('ply', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousPly = Math.max(lastMove?.ply ?? 0, game.move_count ?? 0);
  const nextPly = previousPly + 1;

  const chess = new Chess(game.fen);
  const move = chess.move({
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
    promotion: uci.length > 4 ? uci.substring(4) : undefined,
  });

  if (!move) {
    return jsonResponse({ error: 'Illegal move' }, 400);
  }

  const nextFen = chess.fen();
  const nextTurn = chess.turn();
  const nextStatus = chess.isCheckmate()
    ? 'checkmate'
    : chess.isDraw()
      ? 'draw'
      : 'active';

  const { data: insertedMove, error: insertError } = await supabase
    .from('moves')
    .insert({
      game_id,
      ply: nextPly,
      uci,
      san: move.san,
      fen_after: nextFen,
      played_by: authData.user.id,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse({ error: insertError.message }, 400);
  }

  const { error: gameUpdateError } = await supabase
    .from('games')
    .update({
      fen: nextFen,
      turn: nextTurn,
      last_move_uci: uci,
      move_count: nextPly,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', game_id);

  if (gameUpdateError) {
    return jsonResponse({ error: gameUpdateError.message }, 400);
  }

  return jsonResponse({
    data: {
      move: insertedMove,
      game: {
        id: game_id,
        fen: nextFen,
        turn: nextTurn,
        move_count: nextPly,
        status: nextStatus,
      },
    },
  });
});
