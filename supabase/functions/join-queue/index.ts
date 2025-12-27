import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { parseTimeControl } from '../_shared/time-control.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const timeControl = typeof body?.time_control === 'string' ? body.time_control.trim() : '';

    if (!timeControl) {
      return new Response(JSON.stringify({ error: 'time_control is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { error: upsertError } = await supabase
      .from('match_queue')
      .upsert({ user_id: authData.user.id, time_control: timeControl }, { onConflict: 'user_id' });

    if (upsertError) {
      throw upsertError;
    }

    const { data: opponents, error: opponentError } = await supabase
      .from('match_queue')
      .select('id, user_id, time_control, created_at')
      .eq('time_control', timeControl)
      .neq('user_id', authData.user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (opponentError) {
      throw opponentError;
    }

    let game: Record<string, unknown> | null = null;

    if (opponents && opponents.length > 0) {
      const opponent = opponents[0];
      const whiteId = Math.random() > 0.5 ? authData.user.id : opponent.user_id;
      const blackId = whiteId === authData.user.id ? opponent.user_id : authData.user.id;
      const parsed = parseTimeControl(timeControl);
      const clocks = parsed
        ? {
            initialSeconds: parsed.initialSeconds,
            incrementSeconds: parsed.incrementSeconds,
            white: parsed.initialSeconds,
            black: parsed.initialSeconds,
          }
        : null;

      const { data: createdGame, error: gameError } = await supabase
        .from('games')
        .insert({
          white_id: whiteId,
          black_id: blackId,
          status: 'active',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          turn: 'w',
          clocks,
        })
        .select()
        .single();

      if (gameError) {
        throw gameError;
      }

      game = createdGame as Record<string, unknown>;

      await supabase.from('match_queue').delete().in('user_id', [authData.user.id, opponent.user_id]);
    }

    return new Response(JSON.stringify({ matched: !!game, game }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('join-queue error', error);
    return new Response(JSON.stringify({ error: 'Unable to join queue' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
