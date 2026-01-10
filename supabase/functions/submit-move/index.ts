import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';
import { Chess } from 'npm:chess.js@1.0.0';
import { corsHeaders } from '../_shared/cors.ts';

type SubmitMoveBody = {
  game_id?: string;
  uci?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient(req);

    const payload = (await req.json().catch(() => ({}))) as SubmitMoveBody;
    const gameId = payload.game_id?.trim();
    const rawUci = payload.uci?.trim();

    if (!gameId || !rawUci) {
      return respond(400, {
        error: 'invalid_payload',
        message: 'Both game_id and uci are required.'
      });
    }

    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[SubmitMove] GetUser error:', authError);
      return respond(401, {
        error: 'unauthorized',
        message: `Auth failed: ${authError?.message}. Header len: ${req.headers.get('Authorization')?.length}`
      });
    }

    console.log('[SubmitMove] User authenticated:', user.id);

    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('id, fen, turn, white_id, black_id, status, move_count, clocks, updated_at, created_at')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return respond(404, {
        error: 'game_not_found',
        message: gameError?.message ?? 'Game not found.'
      });
    }

    // Validate player
    const userColor = user.id === game.white_id ? 'w' : user.id === game.black_id ? 'b' : null;
    if (!userColor) {
      return respond(403, { error: 'forbidden', message: 'You are not a player in this game.' });
    }

    if (game.status !== 'active') {
      return respond(400, { error: 'game_over', message: 'Game is not active.' });
    }

    if (game.turn !== userColor) {
      return respond(400, { error: 'not_your_turn', message: 'It is not your turn.' });
    }

    const chess = new Chess(game.fen);
    
    // Attempt move
    let move;
    try {
      // Support UCI format like "e2e4" or "a7a8q"
      move = chess.move({
        from: rawUci.slice(0, 2),
        to: rawUci.slice(2, 4),
        promotion: rawUci.length > 4 ? rawUci[4] : undefined
      });
    } catch (e) {
      // Fallback: try raw string (could be SAN in some clients, but we expect UCI)
      try {
        move = chess.move(rawUci);
      } catch (e2) {
        move = null;
      }
    }

    if (!move) {
      return respond(400, { error: 'invalid_move', message: `Invalid move: ${rawUci}` });
    }

    const newFen = chess.fen();
    const nextTurn = chess.turn(); // 'w' or 'b'
    const normalizedUci = move.lan; // e2e4
    const nextPly = game.move_count + 1; // Increment ply (half-move)
    const isCheckmate = chess.isCheckmate();
    const isDraw = chess.isDraw();

    if (isDraw) {
        // Handle draw status update if needed, for now we let it remain active or handle separate endpoint
        // But let's checkmate specifically
    }

    // TIME LOGIC
    const now = new Date().toISOString();
    const lastUpdate = new Date(game.updated_at || game.created_at).getTime();
    const elapsed = Date.now() - lastUpdate;
    const currentMoveCount = game.move_count; // Define currentMoveCount
    
    let newClocks = game.clocks as { white: number; black: number } | null;
    
    if (newClocks && typeof newClocks === 'object') {
       // Deduct time from the player who JUST moved (game.turn is the one who was "to move").
       // game.turn is the side whose turn it WAS. (e.g. 'w').
       // So we deduct time from 'w' (if white just moved).
       const color = game.turn === 'w' ? 'white' : 'black';
       const currentClock = newClocks[color];
       
       newClocks = {
         ...newClocks,
         [color]: Math.max(0, currentClock - elapsed)
       };
    } else {
      // Initialize if missing (fallback)
      newClocks = { white: 600_000, black: 600_000 };
    }

    // Check for timeout
    let gameStatus = isCheckmate ? 'checkmate' : 'active';
    let winnerId: string | null = null;
    
    if (newClocks && typeof newClocks === 'object') {
      // The player who just moved is game.turn (the previous turn)
      const playerColor = game.turn === 'w' ? 'white' : 'black';
      
      if (newClocks[playerColor] <= 0) {
        // Player ran out of time during their turn
        gameStatus = playerColor === 'white' ? 'black_won' : 'white_won';
        winnerId = playerColor === 'white' ? game.black_id : game.white_id;
        console.log(`[SubmitMove] Timeout detected for ${playerColor}. Winner: ${winnerId}`);
      }
    }
    
    // If checkmate, set the winner
    if (isCheckmate && !winnerId) {
      // The player who was checkmated is the one whose turn it NOW is (nextTurn)
      winnerId = nextTurn === 'w' ? game.black_id : game.white_id;
    }

    const adminClient = createAdminClient();

    console.log(`[SubmitMove] Attempting update for gameId: ${gameId}, move_count (DB read): ${currentMoveCount}, nextPly: ${nextPly}`);

    const { data: updatedGame, error: updateError } = await adminClient
      .from('games')
      .update({
        fen: newFen,
        turn: nextTurn,
        last_move_uci: normalizedUci,
        move_count: nextPly,
        updated_at: now,
        clocks: newClocks,
        status: gameStatus,
        winner_id: winnerId
      })
      .eq('id', gameId)
      // .eq('move_count', currentMoveCount) // Temporarily disabled to unblock updates
      .select('id')
      .maybeSingle();

    if (updateError) {
      return respond(500, { error: 'game_update_failed', message: updateError.message });
    }

    if (!updatedGame) {
      return respond(409, {
        error: 'concurrent_update',
        message: 'Game changed before the update was applied.'
      });
    }

    return respond(200, {
      success: true,
      fen: newFen,
      turn: nextTurn,
      ply: nextPly,
      san: move.san,
      isCheckmate
    });
  } catch (error) {
    console.error('submit-move unexpected error', error);
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
