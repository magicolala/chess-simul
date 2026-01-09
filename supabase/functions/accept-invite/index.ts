import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase-client.ts';
import { parseTimeControl } from '../_shared/time-control.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // User client for auth only
    const supabase = createSupabaseClient(req);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const userId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const inviteId = typeof body?.invite_id === 'string' ? body.invite_id.trim() : '';

    if (!inviteId) {
      return new Response(JSON.stringify({ error: 'invite_id is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Use admin client for all DB operations to bypass RLS
    const adminClient = createAdminClient();

    const { data: invite, error: inviteError } = await adminClient
      .from('invites')
      .select('id, from_user, to_user, time_control, status')
      .eq('id', inviteId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      console.error('Invite lookup failed:', inviteError);
      return new Response(JSON.stringify({ error: 'invite not found', details: inviteError?.message }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Check that the current user is the recipient
    if (invite.to_user !== userId) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Mark invite as accepted
    await adminClient.from('invites').update({ status: 'accepted' }).eq('id', inviteId);

    const parsed = parseTimeControl(invite.time_control);
    const clocks = parsed
      ? {
          initialSeconds: parsed.initialSeconds,
          incrementSeconds: parsed.incrementSeconds,
          white: parsed.initialSeconds,
          black: parsed.initialSeconds
        }
      : null;

    const whiteId = Math.random() > 0.5 ? invite.from_user : invite.to_user;
    const blackId = whiteId === invite.from_user ? invite.to_user : invite.from_user;

    const { data: createdGame, error: gameError } = await adminClient
      .from('games')
      .insert({
        white_id: whiteId,
        black_id: blackId,
        status: 'active',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        clocks,
        game_mode: 'standard'
      })
      .select()
      .single();

    if (gameError) {
      console.error('Game creation failed:', gameError);
      throw gameError;
    }

    await adminClient.from('match_queue').delete().in('user_id', [invite.from_user, invite.to_user]);

    return new Response(JSON.stringify({ game: createdGame }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('accept-invite error', error);
    return new Response(JSON.stringify({ error: 'Unable to accept invite' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
