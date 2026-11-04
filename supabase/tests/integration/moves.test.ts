import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cleanupGamesById, cleanupGamesForUsers, createTestGame } from '../helpers/test-db.ts';
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth.ts';
import { serviceClient } from '../helpers/client.ts';

async function withGame(
  run: (white: TestUser, black: TestUser, gameId: string) => Promise<void>,
  overrides: Record<string, unknown> = {}
) {
  let white: TestUser | null = null;
  let black: TestUser | null = null;
  let gameId: string | null = null;
  try {
    white = await createTestUser('moves');
    black = await createTestUser('moves');
    const game = await createTestGame(white.id, black.id, overrides);
    gameId = game.id as string;
    await run(white, black, gameId);
  } finally {
    const userIds = [white?.id, black?.id].filter((v): v is string => Boolean(v));
    if (gameId) await cleanupGamesById(gameId);
    if (userIds.length) await cleanupGamesForUsers(userIds);
    if (white) await deleteTestUser(white.id);
    if (black) await deleteTestUser(black.id);
  }
}

Deno.test('submit-move atomically persists consecutive moves in order', async () => {
  await withGame(async (white, black, gameId) => {
    const first = await white.client.functions.invoke('submit-move', {
      body: { game_id: gameId, uci: 'e2e4' }
    });
    assert(!first.error, first.error?.message);
    assertEquals(first.data?.ply, 1);

    const second = await black.client.functions.invoke('submit-move', {
      body: { game_id: gameId, uci: 'e7e5' }
    });
    assert(!second.error, second.error?.message);
    assertEquals(second.data?.ply, 2);

    const { data: games, error: gameError } = await serviceClient.from('games')
      .select('fen,turn,move_count,last_move_uci')
      .eq('id', gameId);
    assert(!gameError, gameError?.message);
    assertEquals(games?.length, 1);
    assertEquals(games?.[0].turn, 'w');
    assertEquals(games?.[0].move_count, 2);
    assertEquals(games?.[0].last_move_uci, 'e7e5');

    const { data: moves, error: moveError } = await serviceClient.from('moves')
      .select('ply,uci,san,played_by,fen_after')
      .eq('game_id', gameId)
      .order('ply', { ascending: true });
    assert(!moveError, moveError?.message);
    assertEquals(moves?.length, 2);
    assertEquals(moves?.map((m) => m.uci), ['e2e4', 'e7e5']);
    assertEquals(moves?.map((m) => m.ply), [1, 2]);
    assertEquals(moves?.map((m) => m.played_by), [white.id, black.id]);
    assertEquals(moves?.[1].fen_after, games?.[0].fen);
  });
});

Deno.test('two concurrent first moves never both commit', async () => {
  await withGame(async (white, _black, gameId) => {
    const submissions = await Promise.all([
      white.client.functions.invoke('submit-move', { body: { game_id: gameId, uci: 'e2e4' } }),
      white.client.functions.invoke('submit-move', { body: { game_id: gameId, uci: 'd2d4' } })
    ]);
    assertEquals(submissions.filter((submission) => !submission.error).length, 1);

    const { data: games } = await serviceClient.from('games')
      .select('move_count,last_move_uci').eq('id', gameId);
    const { data: moves } = await serviceClient.from('moves')
      .select('ply,uci').eq('game_id', gameId);
    assertEquals(games?.[0].move_count, 1);
    assertEquals(moves?.length, 1);
    assertEquals(moves?.[0].ply, 1);
    assertEquals(moves?.[0].uci, games?.[0].last_move_uci);

    // A network retry after success must not append another move.
    const retry = await white.client.functions.invoke('submit-move', {
      body: { game_id: gameId, uci: games?.[0].last_move_uci }
    });
    assert(retry.error, 'a replayed move must be rejected');
    const { count } = await serviceClient.from('moves')
      .select('*', { count: 'exact', head: true }).eq('game_id', gameId);
    assertEquals(count, 1);
  });
});

Deno.test('submit-move accepts checkmate and records winner', async () => {
  // After 1.f3 e5 2.g4, ...Qh4# is checkmate.
  await withGame(async (_white, black, gameId) => {
    const result = await black.client.functions.invoke('submit-move', {
      body: { game_id: gameId, uci: 'd8h4' }
    });
    assert(!result.error, result.error?.message);
    assertEquals(result.data?.status, 'checkmate');

    const { data: game } = await serviceClient.from('games')
      .select('status,winner_id,move_count').eq('id', gameId).single();
    assertEquals(game?.status, 'checkmate');
    assertEquals(game?.winner_id, black.id);
    assertEquals(game?.move_count, 4);
  }, {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2',
    turn: 'b',
    move_count: 3
  });
});

Deno.test('timeout never persists a move and records winner', async () => {
  await withGame(async (white, black, gameId) => {
    const rejected = await white.client.functions.invoke('submit-move', {
      body: { game_id: gameId, uci: 'e2e4' }
    });
    assert(rejected.error, 'move made after flag fall must fail');

    const { data: game } = await serviceClient.from('games')
      .select('status,winner_id,move_count').eq('id', gameId).single();
    assertEquals(game?.status, 'timeout');
    assertEquals(game?.winner_id, black.id);
    assertEquals(game?.move_count, 0);

    const { count } = await serviceClient.from('moves')
      .select('*', { head: true, count: 'exact' }).eq('game_id', gameId);
    assertEquals(count, 0);
  }, {
    clocks: { white: 0, black: 300000, unit: 'ms', initialSeconds: 300, incrementSeconds: 0 }
  });
});

Deno.test('complete stored history detects threefold repetition and finishes as a draw', async () => {
  await withGame(async (white, black, gameId) => {
    const played = [
      'g1f3', 'g8f6', 'f3g1', 'f6g8',
      'g1f3', 'g8f6', 'f3g1', 'f6g8'
    ];
    for (let i = 0; i < played.length; i++) {
      const player = i % 2 === 0 ? white : black;
      const { data, error } = await player.client.functions.invoke('submit-move', {
        body: { game_id: gameId, uci: played[i] }
      });
      assert(!error, `Move ${i + 1} failed: ${error?.message}`);
      assertEquals(data?.ply, i + 1);
      assertEquals(data?.status, i === 7 ? 'draw' : 'active');
    }

    const { data: game, error: gameError } = await serviceClient.from('games')
      .select('status,winner_id,move_count')
      .eq('id', gameId)
      .single();
    assert(!gameError, gameError?.message);
    assertEquals(game?.status, 'draw');
    assertEquals(game?.winner_id, null);
    assertEquals(game?.move_count, 8);

    const { data: storedMoves, error: movesError } = await serviceClient.from('moves')
      .select('ply')
      .eq('game_id', gameId)
      .order('ply', { ascending: true });
    assert(!movesError, movesError?.message);
    assertEquals(storedMoves?.map((move) => move.ply), [1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
