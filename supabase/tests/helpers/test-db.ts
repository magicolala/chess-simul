import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { serviceClient } from './client.ts';

export async function cleanupMatchQueue(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  await serviceClient.from('match_queue').delete().in('user_id', userIds);
}

export async function cleanupGamesForUsers(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  await serviceClient.from('games').delete().in('white_id', userIds);
  await serviceClient.from('games').delete().in('black_id', userIds);
}

export async function cleanupMovesForGame(gameId: string): Promise<void> {
  await serviceClient.from('moves').delete().eq('game_id', gameId);
}

export async function cleanupGamesById(gameId: string): Promise<void> {
  await cleanupMovesForGame(gameId);
  await serviceClient.from('games').delete().eq('id', gameId);
}

export async function createTestGame(
  whiteId: string,
  blackId: string,
  overrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const payload = {
    white_id: whiteId,
    black_id: blackId,
    status: 'active',
    turn: 'w',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    move_count: 0,
    clocks: {
      initialSeconds: 300,
      incrementSeconds: 0,
      white: 300,
      black: 300
    },
    ...overrides
  };

  const { data, error } = await serviceClient.from('games').insert(payload).select('*').single();
  assert(!error && data, `Unable to create test game: ${error?.message ?? 'unknown error'}`);

  return data as Record<string, unknown>;
}
