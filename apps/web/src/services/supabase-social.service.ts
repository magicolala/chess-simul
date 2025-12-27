
import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { UserProfile } from './social.service'; // We can reuse the interface

@Injectable({
  providedIn: 'root'
})
export class SupabaseSocialService {
  private supabase = inject(SupabaseClientService).client;

  constructor() {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url,
        bio,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    if (!data) {
        return null;
    }

    // Adapt the data to the UserProfile interface
    const profile: UserProfile = {
      id: data.id,
      name: data.username,
      avatar: data.avatar_url,
      bio: data.bio,
      joinedAt: new Date(data.created_at).getTime(),
      stats: { // Stats are not in the database, so we use default values
        bullet: 1200,
        blitz: 1200,
        rapid: 1200,
        classical: 1200,
      },
      badges: [], // Badges are not in the database yet
      recentGames: [], // Recent games are not in the database yet
    };

    return profile;
  }

  async getUserIdByUsername(username: string): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('get_user_id_by_username', { p_username: username });

    if (error) {
      console.error('Error getting user ID by username:', error);
      return null;
    }

    return data;
  }

  async sendFriendRequest(friendId: string): Promise<void> {
    const { error } = await this.supabase.rpc('send_friend_request', { friend_id: friendId });

    if (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }
}
