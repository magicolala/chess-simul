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
    const inviteId = typeof body?.invite_id === 'string' ? body.invite_id.trim() : '';

    if (!inviteId) {
      return new Response(JSON.stringify({ error: 'invite_id is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, from_user, to_user, time_control, status')
      .eq('id', inviteId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'invite not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (invite.to_user !== authData.user.id) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    await supabase
      .from('invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);

    const parsed = parseTimeControl(invite.time_control);
    const clocks = parsed
      ? {
          initialSeconds: parsed.initialSeconds,
          incrementSeconds: parsed.incrementSeconds,
          white: parsed.initialSeconds,
          black: parsed.initialSeconds,
        }
      : null;

    const whiteId = Math.random() > 0.5 ? invite.from_user : invite.to_user;
    const blackId = whiteId === invite.from_user ? invite.to_user : invite.from_user;

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

    await supabase.from('match_queue').delete().in('user_id', [invite.from_user, invite.to_user]);

    return new Response(JSON.stringify({ game: createdGame }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('accept-invite error', error);
    return new Response(JSON.stringify({ error: 'Unable to accept invite' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
