import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { serviceClient } from '../helpers/client.ts';
import { cleanupGamesForUsers, cleanupMatchQueue } from '../helpers/test-db.ts';
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth.ts';

const TIME_CONTROL = '3+0';

Deno.test('two players can join the queue and get matched', async () => {
  let playerA: TestUser | null = null;
  let playerB: TestUser | null = null;

  try {
    playerA = await createTestUser('matchmaking');
    playerB = await createTestUser('matchmaking');

    const { error: firstError, data: firstResult } = await playerA.client.functions.invoke(
      'join-queue',
      {
        body: { time_control: TIME_CONTROL }
      }
    );
    assert(!firstError, `First queue join failed: ${firstError?.message ?? 'unknown error'}`);

    const { error: secondError, data: secondResult } = await playerB.client.functions.invoke(
      'join-queue',
      {
        body: { time_control: TIME_CONTROL }
      }
    );
    assert(!secondError, `Second queue join failed: ${secondError?.message ?? 'unknown error'}`);

    const payload = secondResult as {
      matched?: boolean;
      game?: { id?: string; white_id?: string; black_id?: string };
    };

    assert(payload.matched, 'Expected matchmaking to succeed after second player joined');
    assert(payload.game?.id, 'Expected matchmaking response to include the created game');

    const { data: createdGames, error: gameQueryError } = await serviceClient
      .from('games')
      .select('id,white_id,black_id,status')
      .eq('id', payload.game.id as string);

    assert(
      !gameQueryError,
      `Unable to verify created game: ${gameQueryError?.message ?? 'unknown'}`
    );
    assertEquals(createdGames?.length, 1);
    assertEquals(createdGames?.[0].status, 'active');
  } finally {
    const ids = [playerA?.id, playerB?.id].filter((value): value is string => Boolean(value));
    if (ids.length) {
      await cleanupMatchQueue(ids);
      await cleanupGamesForUsers(ids);
    }
    if (playerA) {
      await deleteTestUser(playerA.id);
    }
    if (playerB) {
      await deleteTestUser(playerB.id);
    }
  }
});
