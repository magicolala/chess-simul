import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

// This function is intended to be run periodically, e.g., via a daily.dev hook or a custom scheduler.
// It will process the hydra_match_queue, find suitable opponents, and create new games.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabase = createSupabaseClient(req);

    // Fetch all waiting players from the hydra_match_queue
    const { data: waitingPlayers, error: fetchError } = await supabase
      .from('hydra_match_queue')
      .select(
        'id, user_id, elo, max_games, time_control_initial, time_control_increment, created_at'
      )
      .eq('status', 'waiting')
      .order('created_at', { ascending: true }); // Process older entries first

    if (fetchError) {
      throw fetchError;
    }

    if (!waitingPlayers || waitingPlayers.length < 1) {
      return new Response(JSON.stringify({ message: 'No players in Hydra queue to process.' }), {
        headers: corsHeaders
      });
    }

    const processedPlayerIds: string[] = [];
    const gamesToCreate: any[] = [];
    const playersToRemoveFromQueue: string[] = [];

    for (const player of waitingPlayers) {
      if (processedPlayerIds.includes(player.user_id)) {
        continue; // Already processed this player in a match
      }

      // Find potential opponents for this player
      // For simplicity, we're just picking the next available player
      // A more robust solution would involve Elo matching with an expanding range
      const potentialOpponent = waitingPlayers.find(
        (op) =>
          op.user_id !== player.user_id &&
          !processedPlayerIds.includes(op.user_id) &&
          op.time_control_initial === player.time_control_initial &&
          op.time_control_increment === player.time_control_increment
        // Add Elo range logic here in a more advanced version
      );

      if (potentialOpponent) {
        // Assume for simplicity, each player wants to play at least 1 game against a suitable opponent
        // This logic needs to be enhanced for 'max_games'
        // And for creating 'N' games between 'M' players based on max_games etc.

        // Create a new game
        const whiteId = Math.random() > 0.5 ? player.user_id : potentialOpponent.user_id;
        const blackId = whiteId === player.user_id ? potentialOpponent.user_id : player.user_id;

        gamesToCreate.push({
          white_id: whiteId,
          black_id: blackId,
          status: 'active',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial FEN
          turn: 'w',
          clocks: {
            initialSeconds: player.time_control_initial * 60,
            incrementSeconds: player.time_control_increment,
            white: player.time_control_initial * 60,
            black: player.time_control_initial * 60
          }
        });

        // Mark players as processed and ready to be removed from queue
        processedPlayerIds.push(player.user_id, potentialOpponent.user_id);
        playersToRemoveFromQueue.push(player.user_id, potentialOpponent.user_id);
      }
    }

    if (gamesToCreate.length > 0) {
      // Insert new games
      const { error: insertGamesError } = await supabase.from('games').insert(gamesToCreate);
      if (insertGamesError) {
        throw insertGamesError;
      }
    }

    if (playersToRemoveFromQueue.length > 0) {
      // Remove processed players from the queue
      const { error: deleteQueueError } = await supabase
        .from('hydra_match_queue')
        .delete()
        .in('user_id', playersToRemoveFromQueue);

      if (deleteQueueError) {
        throw deleteQueueError;
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed queue. Created ${gamesToCreate.length} games.` }),
      {
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error('process-hydra-queue error', error);
    return new Response(JSON.stringify({ error: 'Failed to process Hydra queue' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
