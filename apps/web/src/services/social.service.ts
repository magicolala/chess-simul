export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'ingame';
  activity: string;
  elo: number;
}

export interface ChatMessage {
  senderId: string;
  text: string;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  joinedAt: number;
  stats: {
    bullet: number;
    blitz: number;
    rapid: number;
    classical: number;
  };
  badges: string[];
  recentGames: unknown[];
}
