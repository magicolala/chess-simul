import { describe, expect, it } from 'vitest';
import { afterMoveClock, normalizeClocks } from '../../../../supabase/functions/_shared/game-clock';

describe('online game clock protocol (#55)', () => {
  const start = '2026-11-04T10:00:00.000Z';

  it('converts old online clocks in seconds to milliseconds', () => {
    expect(normalizeClocks({
      initialSeconds: 300,
      incrementSeconds: 2,
      white: 300,
      black: 299
    })).toEqual({
      initialSeconds: 300,
      incrementSeconds: 2,
      white: 300000,
      black: 299000,
      unit: 'ms'
    });
  });

  it('keeps new millisecond clocks unchanged', () => {
    expect(normalizeClocks({
      initialSeconds: 300,
      incrementSeconds: 2,
      unit: 'ms',
      white: 300000,
      black: 299000
    })?.white).toBe(300000);
  });

  it('keeps older simul clocks without initialSeconds in milliseconds', () => {
    expect(normalizeClocks({ white: 600000, black: 600000 })).toEqual({
      white: 600000,
      black: 600000,
      unit: 'ms'
    });
  });

  it('deducts elapsed time in milliseconds and adds increment in seconds', () => {
    const result = afterMoveClock({
      initialSeconds: 300, incrementSeconds: 2, white: 300, black: 300
    }, 'w', start, Date.parse(start) + 1500);
    expect(result).toMatchObject({
      expired: false,
      clocks: { unit: 'ms', white: 300500, black: 300000 }
    });
  });

  it('never adds increment after timeout', () => {
    const result = afterMoveClock({
      initialSeconds: 300, incrementSeconds: 5, white: 1, black: 300
    }, 'w', start, Date.parse(start) + 1000);
    expect(result.expired).toBe(true);
    expect(result.clocks?.white).toBe(0);
  });

  it('does not invent a clock for an untimed game', () => {
    expect(afterMoveClock(null, 'b', start, Date.parse(start) + 1500)).toEqual({
      clocks: null, expired: false
    });
  });

  it('rejects malformed clocks rather than persisting them', () => {
    expect(() => normalizeClocks({ white: -1, black: 10 })).toThrow();
    expect(() => normalizeClocks({ white: 10, black: Number.NaN })).toThrow();
  });
});
