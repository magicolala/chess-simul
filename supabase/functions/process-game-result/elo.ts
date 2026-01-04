import { Outcome } from './types.ts';

export const DEFAULT_ASSUMED_AGE = 30;
export const MIN_GAMES_FOR_STABLE_K = 30;

export const calculateExpectedScore = (playerElo: number, opponentElo: number) => {
  return 1 / (1 + 10 ** (-(playerElo - opponentElo) / 400));
};

export const determineKFactor = (
  currentElo: number,
  gamesPlayed: number,
  age: number | null | undefined
) => {
  const effectiveAge = typeof age === 'number' ? age : DEFAULT_ASSUMED_AGE;

  if (gamesPlayed < MIN_GAMES_FOR_STABLE_K || (effectiveAge < 18 && currentElo < 2300)) {
    return 40;
  }

  if (currentElo >= 2400) {
    return 10;
  }

  return 20;
};

export const scoreForOutcome = (outcome: Outcome, isWhite: boolean) => {
  if (outcome === 'draw') return 0.5;
  if ((outcome === 'white_won' && isWhite) || (outcome === 'black_won' && !isWhite)) return 1;
  return 0;
};

export const hydraScoreForOutcome = (outcome: Outcome, isWhite: boolean) => {
  if (outcome === 'draw') return 1;
  if ((outcome === 'white_won' && isWhite) || (outcome === 'black_won' && !isWhite)) return 3;
  return -1;
};

export const calculateEloDelta = (
  playerElo: number,
  opponentElo: number,
  outcome: Outcome,
  playerKFactor: number,
  isWhite: boolean
) => {
  const expected = calculateExpectedScore(playerElo, opponentElo);
  const actual = scoreForOutcome(outcome, isWhite);
  return Math.round(playerKFactor * (actual - expected));
};
