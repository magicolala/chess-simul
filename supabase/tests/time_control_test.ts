import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseTimeControl } from '../functions/_shared/time-control.ts';

Deno.test('parseTimeControl returns parsed values for valid inputs', () => {
  assertEquals(parseTimeControl('5+0'), { initialSeconds: 300, incrementSeconds: 0 });
  assertEquals(parseTimeControl(' 3+2 '), { initialSeconds: 180, incrementSeconds: 2 });
  assertEquals(parseTimeControl('10+30'), { initialSeconds: 600, incrementSeconds: 30 });
});

Deno.test('parseTimeControl returns null for invalid inputs', () => {
  assertEquals(parseTimeControl(''), null);
  assertEquals(parseTimeControl('5'), null);
  assertEquals(parseTimeControl('2+'), null);
  assertEquals(parseTimeControl('abc+1'), null);
  assertEquals(parseTimeControl('4+xyz'), null);
});
