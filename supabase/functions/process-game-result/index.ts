import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { calculateEloDelta, determineKFactor } from './elo.ts';
import { Outcome, PlayerContext } from './types.ts';

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
    const { game_id, outcome } = body as { game_id?: string; outcome?: Outcome };

    if (!game_id) {
      return new Response(JSON.stringify({ error: 'game_id and outcome are required.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const validOutcomes: Outcome[] = ['white_won', 'black_won', 'draw'];

    if (!outcome || !validOutcomes.includes(outcome)) {
      return new Response(
        JSON.stringify({ error: 'Invalid outcome. Expect white_won, black_won, or draw.' }),
        {
          status: 400,
          headers: corsHeaders
        }
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
      return new Response(JSON.stringify({ message: 'Game already processed.' }), {
        status: 200,
        headers: corsHeaders
      });
    }

    const getPlayerProfile = async (playerId: string) => {
      const profileQuery = await supabase
        .from('profiles')
        .select('elo, age, games_played')
        .eq('id', playerId)
        .single();

      if (profileQuery.error?.code === '42703') {
        const fallbackProfileQuery = await supabase
          .from('profiles')
          .select('elo')
          .eq('id', playerId)
          .single();

        return {
          data: fallbackProfileQuery.data
            ? { elo: fallbackProfileQuery.data.elo, age: null, games_played: null }
            : null,
          error: fallbackProfileQuery.error
        } as { data: { elo: number; age: number | null; games_played: number | null } | null; error: unknown };
      }

      return profileQuery as unknown as {
        data: { elo: number; age: number | null; games_played: number | null } | null;
        error: unknown;
      };
    };

    const getGamesPlayed = async (playerId: string) => {
      const { count, error } = await supabase
        .from('games')
        .select('id', { count: 'exact', head: true })
        .or(`white_id.eq.${playerId},black_id.eq.${playerId}`)
        .in('status', ['white_won', 'black_won', 'draw']);

      if (error) {
        console.error('Error counting player games:', error);
        return null;
      }

      return count ?? null;
    };

    const mapToPlayerContext = async (playerId: string): Promise<PlayerContext | null> => {
      const { data, error } = await getPlayerProfile(playerId);

      if (error || !data) {
        console.error('Error fetching player profile:', error);
        return null;
      }

      const gamesPlayed =
        data.games_played ?? (await getGamesPlayed(playerId)) ?? 0;

      return {
        elo: data.elo,
        age: typeof data.age === 'number' ? data.age : null,
        gamesPlayed
      };
    };

    const whiteContext = await mapToPlayerContext(game.white_id);
    const blackContext = await mapToPlayerContext(game.black_id);

    if (!whiteContext || !blackContext) {
      return new Response(
        JSON.stringify({ error: 'Error fetching player profiles for ELO update.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const whiteK = determineKFactor(whiteContext.elo, whiteContext.gamesPlayed, whiteContext.age);
    const blackK = determineKFactor(blackContext.elo, blackContext.gamesPlayed, blackContext.age);

    const whiteDelta = calculateEloDelta(
      whiteContext.elo,
      blackContext.elo,
      outcome,
      whiteK,
      true
    );
    const blackDelta = calculateEloDelta(
      blackContext.elo,
      whiteContext.elo,
      outcome,
      blackK,
      false
    );

    const newWhiteElo = whiteContext.elo + whiteDelta;
    const newBlackElo = blackContext.elo + blackDelta;

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
      return new Response(JSON.stringify({ error: 'Error updating player ELOs.' }), {
        status: 500,
        headers: corsHeaders
      });
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
        white_elo_change: whiteDelta,
        black_elo_change: blackDelta,
        new_white_elo: newWhiteElo,
        new_black_elo: newBlackElo
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('process-game-result error', error);
    return new Response(JSON.stringify({ error: 'Failed to process game result' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
