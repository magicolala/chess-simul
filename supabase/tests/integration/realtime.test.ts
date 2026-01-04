import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/auth.ts';
import { createTestGame, cleanupGamesById, cleanupGamesForUsers } from '../helpers/test-db.ts';
import { serviceClient } from '../helpers/client.ts';

Deno.test('realtime channels receive game updates', async () => {
  let playerA: TestUser | null = null;
  let playerB: TestUser | null = null;
  let game: Record<string, unknown> | null = null;
  let channel: ReturnType<typeof serviceClient.channel> | null = null;

  try {
    playerA = await createTestUser('realtime');
    playerB = await createTestUser('realtime');
    game = await createTestGame(playerA.id, playerB.id);

    channel = serviceClient.channel(`public:games:id=eq.${game.id}`);

    const eventPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error('Realtime event not received in time')),
        8000
      );

      channel!.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => {
          clearTimeout(timeoutId);
          resolve(payload);
        }
      );
    });

    await channel.subscribe();

    const { error: updateError } = await serviceClient
      .from('games')
      .update({ status: 'finished' })
      .eq('id', game.id);

    assert(!updateError, `Unable to update game: ${updateError?.message ?? 'unknown error'}`);

    const payload = await eventPromise;
    const typed = payload as { eventType: string; new?: Record<string, unknown> };

    assertEquals(typed.eventType, 'UPDATE');
    assertEquals(typed.new?.status, 'finished');
  } finally {
    if (channel) {
      await channel.unsubscribe();
      serviceClient.removeChannel(channel);
    }

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
