import type {
  GameRow as DbGameRow,
  MoveRow as DbMoveRow,
  SimulTableRow as DbSimulTableRow,
} from '@chess-simul/shared';

export type GameRow = DbGameRow & { turn_color?: 'white' | 'black' };
export type MoveRow = DbMoveRow & { fen?: string };
export type SimulTableRow = DbSimulTableRow & { guest_id?: string | null };

export interface PresenceUser {
  user_id: string;
  username?: string;
}
