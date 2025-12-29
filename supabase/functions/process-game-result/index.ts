
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

// This function processes a completed game, updates player ELOs and Hydra scores.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabase = createSupabaseClient(req);

    // This function will be called by a trusted source (e.g., another Supabase function, or a webhook)
    // so we don't need user authentication here for the context of this task.
    // However, in a production environment, proper authorization is crucial.

    const body = await req.json().catch(() => ({}));
    const { game_id, outcome } = body; // outcome: 'white_won', 'black_won', 'draw'

    if (!game_id || !outcome) {
      return new Response(
        JSON.stringify({ error: 'game_id and outcome are required.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('white_id, black_id, status')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: 'Game not found or error fetching game details.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (game.status === 'draw' || game.status === 'white_won' || game.status === 'black_won') {
        return new Response(
            JSON.stringify({ message: 'Game already processed.' }),
            { status: 200, headers: corsHeaders }
        );
    }

    // Determine score points based on Hydra rules
    let whiteScoreChange = 0;
    let blackScoreChange = 0;

    switch (outcome) {
      case 'white_won':
        whiteScoreChange = 3;
        blackScoreChange = -1;
        break;
      case 'black_won':
        whiteScoreChange = -1;
        blackScoreChange = 3;
        break;
      case 'draw':
        whiteScoreChange = 1;
        blackScoreChange = 1;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid game outcome.' }),
          { status: 400, headers: corsHeaders }
        );
    }

    // Update player ELOs (simple direct update for Hydra scoring)
    const { data: whiteProfile, error: whiteProfileError } = await supabase
      .from('profiles')
      .select('elo')
      .eq('id', game.white_id)
      .single();

    const { data: blackProfile, error: blackProfileError } = await supabase
      .from('profiles')
      .select('elo')
      .eq('id', game.black_id)
      .single();

    if (whiteProfileError || blackProfileError || !whiteProfile || !blackProfile) {
      console.error('Error fetching player profiles:', whiteProfileError, blackProfileError);
      return new Response(
        JSON.stringify({ error: 'Error fetching player profiles for ELO update.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const newWhiteElo = whiteProfile.elo + whiteScoreChange;
    const newBlackElo = blackProfile.elo + blackScoreChange;

    const { error: updateWhiteError } = await supabase
      .from('profiles')
      .update({ elo: newWhiteElo })
      .eq('id', game.white_id);

    const { error: updateBlackError } = await supabase
      .from('profiles')
      .update({ elo: newBlackElo })
      .eq('id', game.black_id);

    if (updateWhiteError || updateBlackError) {
      console.error('Error updating player ELOs:', updateWhiteError, updateBlackError);
      return new Response(
        JSON.stringify({ error: 'Error updating player ELOs.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Update game status to reflect it's processed
    const { error: updateGameStatusError } = await supabase
        .from('games')
        .update({ status: outcome })
        .eq('id', game_id);

    if (updateGameStatusError) {
        console.error('Error updating game status:', updateGameStatusError);
        return new Response(
            JSON.stringify({ error: 'Error updating game status after processing result.' }),
            { status: 500, headers: corsHeaders }
        );
    }


    return new Response(
      JSON.stringify({
        message: 'Game result processed successfully.',
        game_id: game_id,
        white_elo_change: whiteScoreChange,
        black_elo_change: blackScoreChange,
        new_white_elo: newWhiteElo,
        new_black_elo: newBlackElo,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('process-game-result error', error);
    return new Response(JSON.stringify({ error: 'Failed to process game result' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
