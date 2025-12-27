import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Friend, ChatMessage, UserProfile } from './social.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseSocialService {
  private supabaseService = inject(SupabaseClientService);
  private supabase = this.supabaseService.client;

  friends = signal<Friend[]>([]);
  friendRequests = signal<{ id: string; name: string; avatar: string; createdAt: number }[]>([]);
  private messages = signal<Map<string, ChatMessage[]>>(new Map());
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {}

  private get currentUserId(): string | undefined {
    return this.supabaseService.currentUser()?.id;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        `
        id,
        username,
        avatar_url,
        bio,
        created_at
      `
      )
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
      stats: {
        // Stats are not in the database, so we use default values
        bullet: 1200,
        blitz: 1200,
        rapid: 1200,
        classical: 1200
      },
      badges: [], // Badges are not in the database yet
      recentGames: [] // Recent games are not in the database yet
    };

    return profile;
  }

  async getUserIdByUsername(username: string): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('get_user_id_by_username', {
      p_username: username
    });

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

  async loadFriendRequests(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await this.supabase.rpc('list_friend_requests');

    if (error) {
      console.error('Error listing friend requests:', error);
      return;
    }

    const requests = (data ?? []).map((req: any) => ({
      id: req.requestor_id,
      name: req.username ?? 'Unknown player',
      avatar: req.avatar_url ?? 'https://api.dicebear.com/7.x/notionists/svg?seed=chess-friend',
      createdAt: req.created_at ? new Date(req.created_at).getTime() : Date.now()
    }));

    this.friendRequests.set(requests);
  }

  async loadFriends(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await this.supabase.rpc('list_friends');

    if (error) {
      console.error('Error listing friends:', error);
      return;
    }

    const friends = (data ?? []).map(
      (friend: any) =>
        ({
          id: friend.friend_id,
          name: friend.username ?? 'Unknown player',
          avatar:
            friend.avatar_url ?? 'https://api.dicebear.com/7.x/notionists/svg?seed=chess-friend',
          status: 'online' as const,
          activity: 'Disponible',
          elo: 1200
        }) satisfies Friend
    );

    this.friends.set(friends);

    await this.ensureRealtime();
  }

  async acceptRequest(friendId: string): Promise<void> {
    const { error } = await this.supabase.rpc('accept_friend_request', { friend_id: friendId });

    if (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }

    await Promise.all([this.loadFriends(), this.loadFriendRequests()]);
  }

  async declineRequest(friendId: string): Promise<void> {
    const { error } = await this.supabase.rpc('decline_friend_request', { friend_id: friendId });

    if (error) {
      console.error('Error declining friend request:', error);
      throw error;
    }

    await this.loadFriendRequests();
  }

  getMessages(friendId: string) {
    return computed(() => this.messages().get(friendId) || []);
  }

  async fetchMessages(friendId: string): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await this.supabase
      .from('direct_messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(
        `and(sender_id.eq.${this.currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${this.currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const chat = (data ?? []).map(
      (msg: any) =>
        ({
          senderId: msg.sender_id,
          text: msg.content,
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
        }) satisfies ChatMessage
    );

    this.messages.update((current) => {
      const next = new Map(current);
      next.set(friendId, chat);
      return next;
    });

    await this.ensureRealtime();
  }

  async sendMessage(friendId: string, text: string): Promise<void> {
    const senderId = this.currentUserId;
    if (!senderId) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const { data, error } = await this.supabase
      .from('direct_messages')
      .insert({ sender_id: senderId, receiver_id: friendId, content: trimmed })
      .select('created_at')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    const timestamp = data?.created_at ? new Date(data.created_at).getTime() : Date.now();
    this.appendMessage(friendId, { senderId, text: trimmed, timestamp });
  }

  private appendMessage(friendId: string, message: ChatMessage) {
    this.messages.update((current) => {
      const next = new Map(current);
      const existing = next.get(friendId) ?? [];
      next.set(friendId, [...existing, message]);
      return next;
    });
  }

  private async ensureRealtime() {
    if (this.realtimeChannel || !this.currentUserId) return;

    const userId = this.currentUserId;
    this.realtimeChannel = this.supabase
      .channel('direct-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          this.appendMessage(newMessage.sender_id, {
            senderId: newMessage.sender_id,
            text: newMessage.content,
            timestamp: newMessage.created_at
              ? new Date(newMessage.created_at).getTime()
              : Date.now()
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          this.appendMessage(newMessage.receiver_id, {
            senderId: newMessage.sender_id,
            text: newMessage.content,
            timestamp: newMessage.created_at
              ? new Date(newMessage.created_at).getTime()
              : Date.now()
          });
        }
      )
      .subscribe();
  }
}
