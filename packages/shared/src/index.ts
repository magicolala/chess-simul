export type PlayerProfile = {
  name: string;
  rating: number;
  title?: string;
};

export const DEFAULT_SIMUL_TIME_MINUTES = 60;

export function formatPlayerProfile(profile: PlayerProfile): string {
  const title = profile.title ? `${profile.title} ` : '';
  return `${title}${profile.name} (${profile.rating})`;
}

export type { Database } from '../../supabase/types/database.types';
export * from '../../supabase/types/database.types';
