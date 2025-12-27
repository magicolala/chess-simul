export type SimulStatus = 'open' | 'running' | 'closed';
export type SimulTableStatus = 'free' | 'reserved' | 'playing' | 'done';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Simul {
  id: string;
  host_id: string;
  name: string;
  status: SimulStatus;
  created_at?: string;
  updated_at?: string;
}

export interface SimulTable {
  id: string;
  simul_id: string;
  guest_id: string | null;
  game_id: string | null;
  seat_no: number;
  status: SimulTableStatus;
  created_at?: string;
  updated_at?: string;
}

export interface SimulWithTables extends Simul {
  simul_tables: SimulTable[];
}

export interface SimulGame {
  id: string;
  mode: 'simul';
  simul_id: string | null;
  host_id: string | null;
  white_id: string;
  black_id: string;
  status: GameStatus;
  fen: string;
  turn_color: 'white' | 'black';
  created_at?: string;
  updated_at?: string;
}
