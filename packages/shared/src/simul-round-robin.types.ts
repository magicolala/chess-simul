export type RoundRobinSessionStatus = 'draft' | 'started' | 'completed';

export type RoundRobinParticipantStatus = 'active' | 'left';

export type RoundRobinSession = {
  id: string;
  organizerId: string;
  inviteCode: string;
  status: RoundRobinSessionStatus;
  createdAt: string;
  startedAt?: string | null;
};

export type RoundRobinParticipant = {
  id: string;
  userId: string;
  joinedAt: string;
  status: RoundRobinParticipantStatus;
};

export type RoundRobinSessionDetail = RoundRobinSession & {
  participants: RoundRobinParticipant[];
};

export type RoundRobinGameSummary = {
  id: string;
  sessionId: string;
  gameId: string;
  whiteId: string;
  blackId: string;
  status?: string;
};

export type RoundRobinSessionResponse = {
  session: RoundRobinSessionDetail;
  inviteLink?: string;
};

export type RoundRobinJoinResponse = {
  session: RoundRobinSessionDetail;
};

export type RoundRobinStartResponse = {
  sessionId: string;
  gameCount: number;
};
