import type { Database as SupabaseDatabase } from '../../supabase/types/database.types';

export type Database = SupabaseDatabase;

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type UserSettingsRow = Database['public']['Tables']['user_settings']['Row'];
export type SimulRow = Database['public']['Tables']['simuls']['Row'];
export type SimulTableRow = Database['public']['Tables']['simul_tables']['Row'];
export type SimulInviteRow = Database['public']['Tables']['simul_invites']['Row'];
export type GameRow = Database['public']['Tables']['games']['Row'];
export type MoveRow = Database['public']['Tables']['moves']['Row'];
export type FriendRow = Database['public']['Tables']['friends']['Row'];
export type DirectMessageRow = Database['public']['Tables']['direct_messages']['Row'];
export type MatchQueueRow = Database['public']['Tables']['match_queue']['Row'];
export type InviteRow = Database['public']['Tables']['invites']['Row'];

export type SimulStatus = SimulRow['status'];
export type SimulTableStatus = SimulTableRow['status'];
export type GameStatus = GameRow['status'];

export type PlayerProfile = {
  name: string;
  rating: number;
  title?: string;
};

export type TimeControl = {
  initial: number;
  increment: number;
};

export const DEFAULT_SIMUL_TIME_MINUTES = 60;

export function formatPlayerProfile(profile: PlayerProfile): string {
  const title = profile.title ? `${profile.title} ` : '';
  return `${title}${profile.name} (${profile.rating})`;
}

export * from '../../supabase/types/database.types';
