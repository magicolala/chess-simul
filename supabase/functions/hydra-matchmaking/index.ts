import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

const INITIAL_ELO_WINDOW = 100;
const ELO_WIDEN_STEP = 50;
const WIDEN_INTERVAL_SECONDS = 10;

function widenRange(
  elo: number,
  lastRangeUpdateAt: string | null,
  currentMin: number | null,
  currentMax: number | null
) {
  const now = Date.now();
  const lastUpdate = lastRangeUpdateAt ? new Date(lastRangeUpdateAt).getTime() : now;
  const elapsedSeconds = Math.max(0, (now - lastUpdate) / 1000);
  const steps = Math.floor(elapsedSeconds / WIDEN_INTERVAL_SECONDS);
  const baseMin = currentMin ?? elo - INITIAL_ELO_WINDOW;
  const baseMax = currentMax ?? elo + INITIAL_ELO_WINDOW;
  const widened = steps > 0 ? ELO_WIDEN_STEP * steps : 0;

  return {
    eloMin: baseMin - widened,
    eloMax: baseMax + widened,
    lastRangeUpdateAt: steps > 0 ? new Date(now).toISOString() : lastRangeUpdateAt,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const supabase = createSupabaseClient(req);
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  const pathname = req.headers.get('x-path') ?? url.pathname;

  try {
    if (pathname.endsWith('/queue/join') && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { tournamentId, elo, maxGames } = body;

      if (!tournamentId || typeof elo !== 'number' || typeof maxGames !== 'number') {
        return new Response(JSON.stringify({ error: 'invalid input' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const { data: participant, error: participantError } = await supabase
        .from('hydra_tournament_participants')
        .select('active_game_count')
        .eq('tournament_id', tournamentId)
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (participantError) {
        throw participantError;
      }

      if (participant?.active_game_count && participant.active_game_count >= 9) {
        return new Response(JSON.stringify({ error: 'game cap reached' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const eloMin = elo - INITIAL_ELO_WINDOW;
      const eloMax = elo + INITIAL_ELO_WINDOW;

      const { error: upsertError } = await supabase
        .from('hydra_match_queue')
        .upsert(
          {
            user_id: authData.user.id,
            tournament_id: tournamentId,
            elo,
            max_games: maxGames,
            time_control_initial: 5,
            time_control_increment: 3,
            status: 'waiting',
            elo_min: eloMin,
            elo_max: eloMax,
            last_range_update_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        throw upsertError;
      }

      await supabase.from('hydra_matchmaking_events').insert({
        tournament_id: tournamentId,
        player_id: authData.user.id,
        queue_action: 'join',
        elo_min: eloMin,
        elo_max: eloMax,
      });

      return new Response(JSON.stringify({ status: 'waiting', eloMin, eloMax }), {
        headers: corsHeaders,
      });
    }

    if (pathname.endsWith('/queue/leave') && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { tournamentId } = body;

      if (!tournamentId) {
        return new Response(JSON.stringify({ error: 'invalid input' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      await supabase.from('hydra_match_queue').delete().eq('user_id', authData.user.id);

      await supabase.from('hydra_matchmaking_events').insert({
        tournament_id: tournamentId,
        player_id: authData.user.id,
        queue_action: 'leave',
      });

      return new Response(JSON.stringify({ status: 'left' }), {
        headers: corsHeaders,
      });
    }

    if (pathname.endsWith('/queue/status') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('hydra_match_queue')
        .select('elo, elo_min, elo_max, last_range_update_at')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data || data.elo === null) {
        return new Response(JSON.stringify({ status: 'not_queued' }), {
          headers: corsHeaders,
        });
      }

      const widened = widenRange(data.elo, data.last_range_update_at, data.elo_min, data.elo_max);

      await supabase
        .from('hydra_match_queue')
        .update({
          elo_min: widened.eloMin,
          elo_max: widened.eloMax,
          last_range_update_at: widened.lastRangeUpdateAt,
        })
        .eq('user_id', authData.user.id);

      return new Response(
        JSON.stringify({
          status: 'waiting',
          eloMin: widened.eloMin,
          eloMax: widened.eloMax,
        }),
        { headers: corsHeaders }
      );
    }

    if (pathname.endsWith('/queue/process') && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { tournamentId } = body as { tournamentId?: string };

      if (!tournamentId) {
        return new Response(JSON.stringify({ error: 'invalid input' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const { data: queueEntries, error: queueError } = await supabase
        .from('hydra_match_queue')
        .select('*')
        .eq('status', 'waiting')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (queueError) {
        throw queueError;
      }

      if (!queueEntries || queueEntries.length < 2) {
        return new Response(JSON.stringify({ matched: 0 }), { headers: corsHeaders });
      }

      const userIds = queueEntries.map((entry) => entry.user_id);
      const { data: participants, error: participantsError } = await supabase
        .from('hydra_tournament_participants')
        .select('id, user_id, active_game_count')
        .eq('tournament_id', tournamentId)
        .in('user_id', userIds);

      if (participantsError) {
        throw participantsError;
      }

      const participantByUser = new Map(
        (participants ?? []).map((participant) => [participant.user_id, participant])
      );

      const processed = new Set<string>();
      const gamesToCreate: { white_player_id: string; black_player_id: string; tournament_id: string }[] = [];
      const matchedPairs: Array<{ a: string; b: string }> = [];

      for (const entry of queueEntries) {
        if (processed.has(entry.user_id) || entry.elo === null) continue;

        const participant = participantByUser.get(entry.user_id);
        if (participant && participant.active_game_count >= 9) continue;

        const widened = widenRange(entry.elo, entry.last_range_update_at, entry.elo_min, entry.elo_max);

        if (widened.lastRangeUpdateAt && widened.lastRangeUpdateAt !== entry.last_range_update_at) {
          await supabase
            .from('hydra_match_queue')
            .update({
              elo_min: widened.eloMin,
              elo_max: widened.eloMax,
              last_range_update_at: widened.lastRangeUpdateAt,
            })
            .eq('id', entry.id);
        }

        const opponent = queueEntries.find((candidate) => {
          if (candidate.user_id === entry.user_id) return false;
          if (processed.has(candidate.user_id)) return false;
          if (candidate.time_control_initial !== entry.time_control_initial) return false;
          if (candidate.time_control_increment !== entry.time_control_increment) return false;
          if (candidate.elo === null) return false;
          const candidateParticipant = participantByUser.get(candidate.user_id);
          if (candidateParticipant && candidateParticipant.active_game_count >= 9) return false;
          return (
            candidate.elo >= (widened.eloMin ?? entry.elo - INITIAL_ELO_WINDOW) &&
            candidate.elo <= (widened.eloMax ?? entry.elo + INITIAL_ELO_WINDOW)
          );
        });

        if (!opponent) continue;

        const whiteId = Math.random() > 0.5 ? entry.user_id : opponent.user_id;
        const blackId = whiteId === entry.user_id ? opponent.user_id : entry.user_id;

        gamesToCreate.push({
          tournament_id: tournamentId,
          white_player_id: whiteId,
          black_player_id: blackId,
        });

        matchedPairs.push({ a: entry.user_id, b: opponent.user_id });
        processed.add(entry.user_id);
        processed.add(opponent.user_id);
      }

      if (gamesToCreate.length > 0) {
        const { data: createdGames, error: createError } = await supabase
          .from('hydra_games')
          .insert(
            gamesToCreate.map((game) => ({
              ...game,
              status: 'active',
              time_control: '5+3',
              start_time: new Date().toISOString(),
            }))
          )
          .select('id, white_player_id, black_player_id');

        if (createError) {
          throw createError;
        }

        for (const game of createdGames ?? []) {
          await supabase.from('hydra_matchmaking_events').insert({
            tournament_id: tournamentId,
            player_id: game.white_player_id,
            queue_action: 'match',
            matched_game_id: game.id,
          });
          await supabase.from('hydra_matchmaking_events').insert({
            tournament_id: tournamentId,
            player_id: game.black_player_id,
            queue_action: 'match',
            matched_game_id: game.id,
          });
        }

        const playersToRemove = matchedPairs.flatMap((pair) => [pair.a, pair.b]);
        if (playersToRemove.length > 0) {
          await supabase.from('hydra_match_queue').delete().in('user_id', playersToRemove);
        }

        for (const playerId of playersToRemove) {
          const participantEntry = participantByUser.get(playerId);
          if (!participantEntry) continue;
          await supabase
            .from('hydra_tournament_participants')
            .update({ active_game_count: (participantEntry.active_game_count ?? 0) + 1 })
            .eq('id', participantEntry.id);
        }
      }

      const inactivityCutoff = new Date(Date.now() - 20 * 1000).toISOString();
      await supabase
        .from('hydra_games')
        .update({ status: 'forfeited', result: 'forfeit', end_time: new Date().toISOString() })
        .eq('tournament_id', tournamentId)
        .eq('status', 'pending')
        .is('last_move_at', null)
        .lt('start_time', inactivityCutoff);

      return new Response(JSON.stringify({ matched: gamesToCreate.length }), {
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: 'unsupported request' }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('hydra-matchmaking error', error);
    return new Response(JSON.stringify({ error: 'hydra matchmaking failure' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
