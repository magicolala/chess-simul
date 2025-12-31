import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

type RouteMatch = {
  tournamentId: string | null;
  action: 'tournament' | 'join' | 'leaderboard' | 'active-games' | null;
};

function matchRoute(pathname: string): RouteMatch {
  const parts = pathname.split('/').filter(Boolean);
  const tournamentIndex = parts.indexOf('tournaments');
  if (tournamentIndex === -1 || parts.length <= tournamentIndex + 1) {
    return { tournamentId: null, action: null };
  }

  const tournamentId = parts[tournamentIndex + 1];
  const actionPart = parts[tournamentIndex + 2] ?? null;

  if (!actionPart) {
    return { tournamentId, action: 'tournament' };
  }

  if (actionPart === 'join') {
    return { tournamentId, action: 'join' };
  }

  if (actionPart === 'leaderboard') {
    return { tournamentId, action: 'leaderboard' };
  }

  if (actionPart === 'games' && parts[tournamentIndex + 3] === 'active') {
    return { tournamentId, action: 'active-games' };
  }

  return { tournamentId, action: null };
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
      headers: corsHeaders
    });
  }

  const url = new URL(req.url);
  const { tournamentId, action } = matchRoute(url.pathname);

  if (!tournamentId || !action) {
    return new Response(JSON.stringify({ error: 'invalid route' }), {
      status: 404,
      headers: corsHeaders
    });
  }

  try {
    if (action === 'tournament' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('hydra_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify(data), {
        headers: corsHeaders
      });
    }

    if (action === 'join' && req.method === 'POST') {
      const { data: tournament, error: tournamentError } = await supabase
        .from('hydra_tournaments')
        .select('id, type, survival_lives_default')
        .eq('id', tournamentId)
        .maybeSingle();

      if (tournamentError) {
        throw tournamentError;
      }

      const livesRemaining =
        tournament?.type === 'survival' ? (tournament?.survival_lives_default ?? 3) : null;

      const { data, error } = await supabase
        .from('hydra_tournament_participants')
        .upsert(
          {
            tournament_id: tournamentId,
            user_id: authData.user.id,
            score: 0,
            lives_remaining: livesRemaining
          },
          { onConflict: 'tournament_id,user_id' }
        )
        .select('*')
        .maybeSingle();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify(data), {
        headers: corsHeaders
      });
    }

    if (action === 'leaderboard' && req.method === 'GET') {
      const { data: tournament, error: tournamentError } = await supabase
        .from('hydra_tournaments')
        .select('type')
        .eq('id', tournamentId)
        .maybeSingle();

      if (tournamentError) {
        throw tournamentError;
      }

      const { data, error } = await supabase
        .from('hydra_tournament_participants')
        .select('user_id, score, eliminated_at')
        .eq('tournament_id', tournamentId)
        .order('score', { ascending: false })
        .order('eliminated_at', { ascending: true, nullsFirst: false });

      if (error) {
        throw error;
      }

      const leaderboard = (data ?? []).map((entry, index) => ({
        playerId: entry.user_id,
        scoreTotal: entry.score,
        eliminatedAt: entry.eliminated_at,
        rank: index + 1,
        type: tournament?.type ?? 'arena'
      }));

      return new Response(JSON.stringify(leaderboard), {
        headers: corsHeaders
      });
    }

    if (action === 'active-games' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('hydra_games')
        .select('*')
        .eq('tournament_id', tournamentId)
        .or(`white_player_id.eq.${authData.user.id},black_player_id.eq.${authData.user.id}`)
        .in('status', ['pending', 'active']);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify(data), {
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ error: 'unsupported request' }), {
      status: 400,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('hydra-tournaments error', error);
    return new Response(JSON.stringify({ error: 'hydra tournaments failure' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
