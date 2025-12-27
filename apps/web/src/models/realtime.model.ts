export interface GameRow {
  id: string;
  status?: string;
  fen?: string;
  updated_at?: string;
  simul_id?: string | null;
  turn_color?: string;
  [key: string]: unknown;
}

export interface MoveRow {
  id: string;
  game_id: string;
  ply?: number;
  uci?: string;
  san?: string;
  fen?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SimulTableRow {
  id: string;
  simul_id: string;
  guest_id?: string | null;
  game_id?: string | null;
  seat_no?: number;
  status?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface PresenceUser {
  user_id: string;
  username?: string;
}
