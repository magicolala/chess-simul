
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json().catch(() => ({}));
    const { elo, max_games, time_control_initial, time_control_increment } = body;

    // Validate inputs
    if (
      typeof elo !== 'number' ||
      typeof max_games !== 'number' || max_games < 1 ||
      typeof time_control_initial !== 'number' || time_control_initial <= 0 ||
      typeof time_control_increment !== 'number' || time_control_increment < 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid input: elo (number), max_games (number >= 1), time_control_initial (number > 0), and time_control_increment (number >= 0) are required.',
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Upsert the user into the hydra_match_queue
    const { error: upsertError } = await supabase
      .from('hydra_match_queue')
      .upsert(
        {
          user_id: authData.user.id,
          elo: elo,
          max_games: max_games,
          time_control_initial: time_control_initial,
          time_control_increment: time_control_increment,
          status: 'waiting',
        },
        { onConflict: 'user_id' } // If user is already in queue, update their preferences
      );

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify({ message: 'Successfully joined Hydra queue' }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('join-hydra-queue error', error);
    return new Response(JSON.stringify({ error: 'Failed to join Hydra queue' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
