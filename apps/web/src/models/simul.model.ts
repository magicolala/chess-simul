import type {
  GameRow,
  GameStatus,
  SimulRow,
  SimulStatus,
  SimulTableRow,
  SimulTableStatus,
  TimeControl
} from '@chess-simul/shared';

export type Simul = SimulRow & { time_control: TimeControl };
export type SimulTable = SimulTableRow;
export type SimulWithTables = Simul & { simul_tables: SimulTable[] };

export type SimulGame = GameRow & {
  mode?: 'simul';
  host_id?: string | null;
  turn_color?: 'white' | 'black';
};

export type { SimulStatus, SimulTableStatus, GameStatus, TimeControl };
