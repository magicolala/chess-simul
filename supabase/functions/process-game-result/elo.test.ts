import { assertAlmostEquals, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  calculateEloDelta,
  calculateExpectedScore,
  determineKFactor,
  scoreForOutcome
} from './elo.ts';
import { Outcome } from './types.ts';

const WITHIN = 0.01;

Deno.test('expected score follows Elo formula', () => {
  const expected = calculateExpectedScore(1600, 1400);
  assertAlmostEquals(expected, 1 / (1 + 10 ** (-(1600 - 1400) / 400)), WITHIN);
});

Deno.test('scoreForOutcome maps outcomes correctly', () => {
  const cases: Array<{ outcome: Outcome; isWhite: boolean; expected: number }> = [
    { outcome: 'white_won', isWhite: true, expected: 1 },
    { outcome: 'white_won', isWhite: false, expected: 0 },
    { outcome: 'black_won', isWhite: true, expected: 0 },
    { outcome: 'black_won', isWhite: false, expected: 1 },
    { outcome: 'draw', isWhite: true, expected: 0.5 },
    { outcome: 'draw', isWhite: false, expected: 0.5 }
  ];

  for (const testCase of cases) {
    assertEquals(scoreForOutcome(testCase.outcome, testCase.isWhite), testCase.expected);
  }
});

Deno.test('determineKFactor handles age, games played, and rating thresholds', () => {
  assertEquals(determineKFactor(1200, 5, 25), 40); // provisional player
  assertEquals(determineKFactor(2200, 35, 16), 40); // junior under 2300
  assertEquals(determineKFactor(2500, 40, 25), 10); // elite rating
  assertEquals(determineKFactor(2000, 40, 25), 20); // default
});

Deno.test('calculateEloDelta applies symmetric deltas for win/loss/draw', () => {
  const whiteElo = 1500;
  const blackElo = 1500;
  const kFactor = 20;

  const whiteWinDelta = calculateEloDelta(whiteElo, blackElo, 'white_won', kFactor, true);
  const blackLossDelta = calculateEloDelta(blackElo, whiteElo, 'white_won', kFactor, false);
  assertEquals(whiteWinDelta, -blackLossDelta);

  const drawDelta = calculateEloDelta(whiteElo, blackElo, 'draw', kFactor, true);
  assertEquals(drawDelta, 0);
});
