export type Outcome = 'white_won' | 'black_won' | 'draw';

export type PlayerContext = {
  elo: number;
  age: number | null;
  gamesPlayed: number;
};
