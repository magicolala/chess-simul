export type HydraTournamentType = 'arena' | 'survival';
export type HydraTournamentStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export type HydraTournament = {
  id: string;
  name: string;
  type: HydraTournamentType;
  status: HydraTournamentStatus;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  survivalLivesDefault: number | null;
};

export type HydraParticipant = {
  id: string;
  tournamentId: string;
  playerId: string;
  scoreTotal: number;
  livesRemaining: number | null;
  eliminatedAt: string | null;
  activeGameCount: number;
  joinedAt: string;
};

export type HydraGameStatus = 'pending' | 'active' | 'finished' | 'forfeited';
export type HydraGameResult = 'whiteWin' | 'blackWin' | 'draw' | 'forfeit';

export type HydraGame = {
  id: string;
  tournamentId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  status: HydraGameStatus;
  result: HydraGameResult | null;
  timeControl: string;
  startTime: string;
  endTime: string | null;
  lastMoveAt: string | null;
};

export type HydraScoreEvent = {
  id: string;
  tournamentId: string;
  participantId: string;
  gameId: string;
  delta: number;
  reason: 'win' | 'draw' | 'loss' | 'forfeit';
  createdAt: string;
};

export type HydraMatchmakingEvent = {
  id: string;
  tournamentId: string;
  playerId: string;
  queueAction: 'join' | 'leave' | 'match';
  eloMin: number | null;
  eloMax: number | null;
  matchedGameId: string | null;
  createdAt: string;
};
