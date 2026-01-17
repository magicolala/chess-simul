import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const badRequest = (message: string, status = 400) => jsonResponse({ error: message }, status);

const getUserOrFail = async (req: Request) => {
  const supabase = createSupabaseClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: jsonResponse({ error: 'unauthorized' }, 401) } as const;
  }
  return { supabase, user: data.user } as const;
};

const isAnonymousUser = (user: {
  app_metadata?: Record<string, unknown>;
  is_anonymous?: boolean;
}) => Boolean(user.is_anonymous || user.app_metadata?.provider === 'anonymous');

const readBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

const inviteAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const createInviteCode = (length = 8) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => inviteAlphabet[value % inviteAlphabet.length]).join('');
};

const createSessionWithInvite = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();
    const { data: session, error } = await supabase
      .from('simul_round_robin_sessions')
      .insert({
        organizer_id: userId,
        invite_code: inviteCode,
        status: 'draft'
      })
      .select('id, organizer_id, invite_code, status, created_at, started_at')
      .single();

    if (!error && session) {
      return { session, inviteCode };
    }

    if (error && error.code !== '23505') {
      return { error };
    }
  }

  return { error: { message: 'invite_code_conflict' } };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'simul-sessions') {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  const sessionId = parts[1] ?? null;
  const action = parts[2] ?? null;

  if (req.method === 'GET' && sessionId === 'invite' && action) {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;

    const inviteCode = action.trim();
    const { data, error } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select(
        'id, organizer_id, invite_code, status, created_at, started_at, simul_round_robin_participants(id, user_id, status, joined_at)'
      )
      .eq('invite_code', inviteCode)
      .single();

    if (error || !data) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    const normalized = {
      id: data.id,
      organizerId: data.organizer_id,
      inviteCode: data.invite_code,
      status: data.status,
      createdAt: data.created_at,
      startedAt: data.started_at,
      participants: (data.simul_round_robin_participants ?? []).map((participant) => ({
        id: participant.id,
        userId: participant.user_id,
        status: participant.status,
        joinedAt: participant.joined_at
      }))
    };

    return jsonResponse({ session: normalized });
  }

  if (req.method === 'POST' && !sessionId) {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;
    if (isAnonymousUser(auth.user)) {
      return jsonResponse({ error: 'guest_not_allowed' }, 403);
    }

    const {
      session,
      inviteCode,
      error: sessionError
    } = await createSessionWithInvite(auth.supabase, auth.user.id);

    if (sessionError || !session) {
      console.error('RR create session error', sessionError);
      return jsonResponse({ error: 'unable_to_create_session' }, 500);
    }

    const { error: participantError } = await auth.supabase
      .from('simul_round_robin_participants')
      .insert({ session_id: session.id, user_id: auth.user.id, status: 'active' });

    if (participantError) {
      console.error('RR create participant error', participantError);
      return jsonResponse({ error: 'unable_to_add_organizer' }, 500);
    }

    const { data: detail, error: detailError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select(
        'id, organizer_id, invite_code, status, created_at, started_at, simul_round_robin_participants(id, user_id, status, joined_at)'
      )
      .eq('id', session.id)
      .single();

    if (detailError || !detail) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    const normalized = {
      id: detail.id,
      organizerId: detail.organizer_id,
      inviteCode: detail.invite_code,
      status: detail.status,
      createdAt: detail.created_at,
      startedAt: detail.started_at,
      participants: (detail.simul_round_robin_participants ?? []).map((participant) => ({
        id: participant.id,
        userId: participant.user_id,
        status: participant.status,
        joinedAt: participant.joined_at
      }))
    };

    const origin = req.headers.get('origin') ?? '';
    const inviteLink = origin ? `${origin}/?rr_invite=${inviteCode}` : null;

    return jsonResponse({ session: normalized, inviteLink }, 201);
  }

  if (req.method === 'DELETE' && sessionId && !action) {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;
    if (isAnonymousUser(auth.user)) {
      return jsonResponse({ error: 'guest_not_allowed' }, 403);
    }

    const { data: session, error: sessionError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select('id, organizer_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    if (session.organizer_id !== auth.user.id) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    if (session.status !== 'draft') {
      return jsonResponse({ error: 'session_locked' }, 409);
    }

    const { error: deleteError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .delete()
      .eq('id', session.id);

    if (deleteError) {
      console.error('RR delete session error', deleteError);
      return jsonResponse({ error: 'unable_to_delete_session' }, 500);
    }

    return jsonResponse({ success: true });
  }

  if (req.method === 'GET' && sessionId && !action) {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;

    const { data, error } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select(
        'id, organizer_id, invite_code, status, created_at, started_at, simul_round_robin_participants(id, user_id, status, joined_at)'
      )
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    const normalized = {
      id: data.id,
      organizerId: data.organizer_id,
      inviteCode: data.invite_code,
      status: data.status,
      createdAt: data.created_at,
      startedAt: data.started_at,
      participants: (data.simul_round_robin_participants ?? []).map((participant) => ({
        id: participant.id,
        userId: participant.user_id,
        status: participant.status,
        joinedAt: participant.joined_at
      }))
    };

    return jsonResponse({ session: normalized });
  }

  if (req.method === 'POST' && sessionId && action === 'join') {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;

    const body = await readBody(req);
    const inviteCode = typeof body?.invite_code === 'string' ? body.invite_code.trim() : '';
    if (!inviteCode) {
      return badRequest('invite_code_required');
    }

    const { data: session, error: sessionError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select('id, organizer_id, invite_code, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    if (session.invite_code !== inviteCode) {
      return jsonResponse({ error: 'invalid_invite_code' }, 403);
    }

    if (session.status !== 'draft') {
      return jsonResponse({ error: 'session_locked' }, 409);
    }

    const { error: joinError } = await auth.supabase
      .from('simul_round_robin_participants')
      .upsert(
        { session_id: session.id, user_id: auth.user.id, status: 'active' },
        { onConflict: 'session_id,user_id' }
      );

    if (joinError) {
      console.error('RR join error', joinError);
      return jsonResponse({ error: 'unable_to_join' }, 500);
    }

    const { data: detail, error: detailError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select(
        'id, organizer_id, invite_code, status, created_at, started_at, simul_round_robin_participants(id, user_id, status, joined_at)'
      )
      .eq('id', session.id)
      .single();

    if (detailError || !detail) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }
    const normalized = {
      id: detail.id,
      organizerId: detail.organizer_id,
      inviteCode: detail.invite_code,
      status: detail.status,
      createdAt: detail.created_at,
      startedAt: detail.started_at,
      participants: (detail.simul_round_robin_participants ?? []).map((participant) => ({
        id: participant.id,
        userId: participant.user_id,
        status: participant.status,
        joinedAt: participant.joined_at
      }))
    };

    return jsonResponse({ session: normalized });
  }

  if (req.method === 'POST' && sessionId && action === 'start') {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;

    const { data: session, error: sessionError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select('id, organizer_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    if (session.organizer_id !== auth.user.id) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    if (session.status !== 'draft') {
      return jsonResponse({ error: 'session_locked' }, 409);
    }

    const { data: participants, error: participantError } = await auth.supabase
      .from('simul_round_robin_participants')
      .select('user_id')
      .eq('session_id', session.id)
      .eq('status', 'active');

    if (participantError || !participants) {
      console.error('RR participants error', participantError);
      return jsonResponse({ error: 'unable_to_load_participants' }, 500);
    }

    if (participants.length < 2) {
      return jsonResponse({ error: 'not_enough_participants' }, 400);
    }

    const { error: updateError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .update({ status: 'started', started_at: new Date().toISOString() })
      .eq('id', session.id);

    if (updateError) {
      console.error('RR session update error', updateError);
      return jsonResponse({ error: 'unable_to_start_session' }, 500);
    }

    const users = participants.map((p) => p.user_id);
    const gamesToInsert = [];
    for (let i = 0; i < users.length; i += 1) {
      for (let j = i + 1; j < users.length; j += 1) {
        const [userA, userB] = [users[i], users[j]];
        const whiteId = Math.random() > 0.5 ? userA : userB;
        const blackId = whiteId === userA ? userB : userA;
        gamesToInsert.push({
          white_id: whiteId,
          black_id: blackId,
          status: 'active',
          turn: 'w',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        });
      }
    }

    const { data: createdGames, error: gameError } = await auth.supabase
      .from('games')
      .insert(gamesToInsert)
      .select('id, white_id, black_id');

    if (gameError || !createdGames) {
      console.error('RR create games error', gameError);
      return jsonResponse({ error: 'unable_to_create_games' }, 500);
    }

    const links = createdGames.map((game) => ({
      session_id: session.id,
      game_id: game.id,
      white_id: game.white_id,
      black_id: game.black_id
    }));

    const { error: linkError } = await auth.supabase
      .from('simul_round_robin_game_links')
      .insert(links);

    if (linkError) {
      console.error('RR create game links error', linkError);
      return jsonResponse({ error: 'unable_to_link_games' }, 500);
    }

    return jsonResponse({ sessionId: session.id, gameCount: createdGames.length });
  }

  if (req.method === 'GET' && sessionId && action === 'games') {
    const auth = await getUserOrFail(req);
    if ('error' in auth) return auth.error;

    const { data: session, error: sessionError } = await auth.supabase
      .from('simul_round_robin_sessions')
      .select('organizer_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return jsonResponse({ error: 'session_not_found' }, 404);
    }

    let query = auth.supabase
      .from('simul_round_robin_game_links')
      .select('id, session_id, game_id, white_id, black_id, games(status)')
      .eq('session_id', sessionId);

    if (session.organizer_id !== auth.user.id) {
      query = query.or(`white_id.eq.${auth.user.id},black_id.eq.${auth.user.id}`);
    }

    const { data: games, error: gamesError } = await query;

    if (gamesError) {
      console.error('RR games error', gamesError);
      return jsonResponse({ error: 'unable_to_load_games' }, 500);
    }

    const normalized = (games ?? []).map((game) => ({
      id: game.id,
      sessionId: game.session_id,
      gameId: game.game_id,
      whiteId: game.white_id,
      blackId: game.black_id,
      status: game.games?.status ?? null
    }));

    return jsonResponse({ games: normalized });
  }

  return jsonResponse({ error: 'not_found' }, 404);
});
