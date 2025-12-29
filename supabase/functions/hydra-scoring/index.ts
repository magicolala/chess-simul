import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

type GameResult = 'white_win' | 'black_win' | 'draw' | 'forfeit';

type ScoreDelta = {
  participantId: string;
  delta: number;
  reason: 'win' | 'draw' | 'loss' | 'forfeit';
  isLoss: boolean;
};

function buildDeltas(
  whiteParticipantId: string,
  blackParticipantId: string,
  result: GameResult,
  forfeitPlayerId?: string
): ScoreDelta[] {
  if (result === 'draw') {
    return [
      { participantId: whiteParticipantId, delta: 1, reason: 'draw', isLoss: false },
      { participantId: blackParticipantId, delta: 1, reason: 'draw', isLoss: false },
    ];
  }

  const whiteWon = result === 'white_win';
  const blackWon = result === 'black_win';
  const winnerId = whiteWon ? whiteParticipantId : blackWon ? blackParticipantId : null;
  const loserId = whiteWon ? blackParticipantId : blackWon ? whiteParticipantId : forfeitPlayerId;

  if (!winnerId || !loserId) {
    return [];
  }

  return [
    { participantId: winnerId, delta: 3, reason: 'win', isLoss: false },
    { participantId: loserId, delta: -1, reason: result === 'forfeit' ? 'forfeit' : 'loss', isLoss: true },
  ];
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'unsupported request' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      tournamentId,
      gameId,
      whiteParticipantId,
      blackParticipantId,
      result,
      forfeitParticipantId,
    } = body as {
      tournamentId?: string;
      gameId?: string;
      whiteParticipantId?: string;
      blackParticipantId?: string;
      result?: GameResult;
      forfeitParticipantId?: string;
    };

    if (!tournamentId || !gameId || !whiteParticipantId || !blackParticipantId || !result) {
      return new Response(JSON.stringify({ error: 'invalid input' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('hydra_tournaments')
      .select('type')
      .eq('id', tournamentId)
      .maybeSingle();

    if (tournamentError) {
      throw tournamentError;
    }

    const deltas = buildDeltas(
      whiteParticipantId,
      blackParticipantId,
      result,
      forfeitParticipantId
    );

    const scoreEvents = deltas.map((delta) => ({
      tournament_id: tournamentId,
      participant_id: delta.participantId,
      game_id: gameId,
      delta: delta.delta,
      reason: delta.reason,
    }));

    if (scoreEvents.length > 0) {
      const { error: insertError } = await supabase
        .from('hydra_score_events')
        .insert(scoreEvents);

      if (insertError) {
        throw insertError;
      }
    }

    for (const delta of deltas) {
      const { data: participant, error: participantError } = await supabase
        .from('hydra_tournament_participants')
        .select('score, lives_remaining, eliminated_at')
        .eq('id', delta.participantId)
        .maybeSingle();

      if (participantError) {
        throw participantError;
      }

      const newScore = (participant?.score ?? 0) + delta.delta;
      let livesRemaining = participant?.lives_remaining ?? null;
      let eliminatedAt = participant?.eliminated_at ?? null;

      if (tournament?.type === 'survival' && delta.isLoss && livesRemaining !== null) {
        livesRemaining = Math.max(0, livesRemaining - 1);
        if (livesRemaining === 0) {
          eliminatedAt = new Date().toISOString();
        }
      }

      const { error: updateError } = await supabase
        .from('hydra_tournament_participants')
        .update({
          score: newScore,
          lives_remaining: livesRemaining,
          eliminated_at: eliminatedAt,
        })
        .eq('id', delta.participantId);

      if (updateError) {
        throw updateError;
      }
    }

    const { error: gameUpdateError } = await supabase
      .from('hydra_games')
      .update({
        status: 'finished',
        result,
        end_time: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (gameUpdateError) {
      throw gameUpdateError;
    }

    return new Response(JSON.stringify({ status: 'scored' }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('hydra-scoring error', error);
    return new Response(JSON.stringify({ error: 'hydra scoring failure' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
