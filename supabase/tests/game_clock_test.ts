import {
  assertEquals,
  assertThrows
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { afterMoveClock, normalizeClocks } from '../functions/_shared/game-clock.ts';

Deno.test('legacy seconds clocks normalize to milliseconds without losing metadata', () => {
  assertEquals(normalizeClocks({
    initialSeconds: 300,
    incrementSeconds: 2,
    white: 300,
    black: 297
  }), {
    initialSeconds: 300,
    incrementSeconds: 2,
    white: 300000,
    black: 297000,
    unit: 'ms'
  });
});

Deno.test('explicit millisecond clocks are never re-converted', () => {
  assertEquals(normalizeClocks({
    initialSeconds: 300,
    incrementSeconds: 2,
    white: 300000,
    black: 297000,
    unit: 'ms'
  })?.black, 297000);
});

Deno.test('historical simul clocks without initialSeconds were already milliseconds', () => {
  assertEquals(normalizeClocks({ white: 600000, black: 600000 }), {
    white: 600000,
    black: 600000,
    unit: 'ms'
  });
});

Deno.test('successful move deducts elapsed milliseconds and adds seconds-based increment', () => {
  const startedAt = '2026-11-04T10:00:00.000Z';
  const result = afterMoveClock(
    { initialSeconds: 300, incrementSeconds: 2, white: 300, black: 300 },
    'w', startedAt, Date.parse(startedAt) + 1500
  );
  assertEquals(result.expired, false);
  assertEquals(result.clocks?.white, 300500);
  assertEquals(result.clocks?.black, 300000);
});

Deno.test('flag fall forbids move and never adds increment', () => {
  const startedAt = '2026-11-04T10:00:00.000Z';
  const result = afterMoveClock(
    { initialSeconds: 300, incrementSeconds: 2, white: 1, black: 250 },
    'w', startedAt, Date.parse(startedAt) + 1000
  );
  assertEquals(result.expired, true);
  assertEquals(result.clocks?.white, 0);
});

Deno.test('untimed games and invalid clocks are handled explicitly', () => {
  assertEquals(afterMoveClock(null, 'w', '2026-11-04T10:00:00Z', Date.now()), {
    clocks: null,
    expired: false
  });
  assertThrows(() => normalizeClocks({ white: -1, black: 200 }));
  assertThrows(() => normalizeClocks({ white: 200, black: NaN }));
  assertThrows(() => afterMoveClock({white: 200, black: 200}, 'w', 'invalid', Date.now()));
});
