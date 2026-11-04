/**
 * Chess Simul clock protocol (#55).
 * Remaining "white"/"black" times are always milliseconds once normalized.
 * "initialSeconds" and "incrementSeconds" remain metadata in seconds.
 *
 * Historical matchmaking/Hydra clocks had initialSeconds but no unit and
 * stored remaining values in seconds. Historical simuls without initialSeconds
 * already used milliseconds. The explicit unit marker prevents guessing.
 */
export type ClockValues = {
  white: number;
  black: number;
  initialSeconds?: number;
  incrementSeconds?: number;
  unit?: 'ms' | 's';
};

export type MillisecondClocks = Omit<ClockValues, 'unit'> & { unit: 'ms' };

const isFiniteNonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function normalizeClocks(input: unknown): MillisecondClocks | null {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_clocks');
  }

  const value = input as ClockValues;
  if (!isFiniteNonnegative(value.white) || !isFiniteNonnegative(value.black)) {
    throw new Error('invalid_clocks');
  }
  if (
    (value.initialSeconds !== undefined && !isFiniteNonnegative(value.initialSeconds)) ||
    (value.incrementSeconds !== undefined && !isFiniteNonnegative(value.incrementSeconds)) ||
    (value.unit !== undefined && value.unit !== 'ms' && value.unit !== 's')
  ) {
    throw new Error('invalid_clocks');
  }

  const factor = value.unit === 's' || (!value.unit && value.initialSeconds !== undefined)
    ? 1000
    : 1;
  return {
    ...value,
    unit: 'ms',
    white: Math.round(value.white * factor),
    black: Math.round(value.black * factor)
  };
}

export function spentMilliseconds(updatedAt: string, nowMs: number): number {
  const startedAt = Date.parse(updatedAt);
  if (!Number.isFinite(startedAt)) throw new Error('invalid_clock_timestamp');
  return Math.max(0, nowMs - startedAt);
}

export function afterMoveClock(
  input: unknown,
  turn: 'w' | 'b',
  updatedAt: string,
  nowMs: number
): { clocks: MillisecondClocks | null; expired: boolean } {
  const clocks = normalizeClocks(input);
  if (!clocks) return { clocks: null, expired: false };
  const color = turn === 'w' ? 'white' : 'black';
  const remaining = clocks[color] - spentMilliseconds(updatedAt, nowMs);
  if (remaining <= 0) {
    return { clocks: { ...clocks, [color]: 0 }, expired: true };
  }
  const incrementMs = (clocks.incrementSeconds ?? 0) * 1000;
  return {
    clocks: { ...clocks, [color]: Math.round(remaining + incrementMs) },
    expired: false
  };
}
