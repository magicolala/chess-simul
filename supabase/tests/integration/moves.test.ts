import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  cleanupGamesById,
  cleanupGamesForUsers,
  createTestGame,
  cleanupMovesForGame
} from '../helpers/test-db.ts';
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth.ts';
import { serviceClient } from '../helpers/client.ts';

Deno.test('submit-move updates the game and move history', async () => {
  let playerA: TestUser | null = null;
  let playerB: TestUser | null = null;
  let game: Record<string, unknown> | null = null;

  try {
    playerA = await createTestUser('moves');
    playerB = await createTestUser('moves');
    game = await createTestGame(playerA.id, playerB.id);

    const { error: moveError } = await playerA.client.functions.invoke('submit-move', {
      body: { game_id: game.id, uci: 'e2e4' }
    });

    assert(!moveError, `submit-move call failed: ${moveError?.message ?? 'unknown error'}`);

    const { data: updatedGames, error: gameFetchError } = await serviceClient
      .from('games')
      .select('move_count,turn,last_move_uci,fen')
      .eq('id', game.id);

    assert(
      !gameFetchError,
      `Unable to read updated game: ${gameFetchError?.message ?? 'unknown error'}`
    );
    assertEquals(updatedGames?.length, 1);
    assertEquals(updatedGames?.[0].move_count, 1);
    assertEquals(updatedGames?.[0].turn, 'b');
    assertEquals(updatedGames?.[0].last_move_uci, 'e2e4');

    const { data: recordedMoves, error: moveQueryError } = await serviceClient
      .from('moves')
      .select('ply,uci,played_by')
      .eq('game_id', game.id);

    assert(
      !moveQueryError,
      `Unable to query recorded moves: ${moveQueryError?.message ?? 'unknown error'}`
    );
    assertEquals(recordedMoves?.length, 1);
    assertEquals(recordedMoves?.[0].uci, 'e2e4');
  } finally {
    const userIds = [playerA?.id, playerB?.id].filter((value): value is string => Boolean(value));
    if (userIds.length) {
      await cleanupGamesForUsers(userIds);
    }
    if (game?.id) {
      await cleanupGamesById(game.id as string);
    }
    if (playerA) {
      await deleteTestUser(playerA.id);
    }
    if (playerB) {
      await deleteTestUser(playerB.id);
    }
  }
});
