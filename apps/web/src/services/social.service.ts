import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'ingame' | 'offline';
  activity?: string; // e.g. "Playing Blitz"
  elo: number;
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlockedAt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  joinedAt: number;
  stats: {
    bullet: number;
    blitz: number;
    rapid: number;
    classical: number;
  };
  badges: Badge[];
  recentGames: any[]; // Simplified for mock
}

export interface ChatMessage {
  senderId: string;
  text: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private auth = inject(AuthService);

  // State
  friends = signal<Friend[]>([
    {
      id: 'alice',
      name: 'Alice_Gambit',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alice',
      status: 'ingame',
      activity: 'Blitz 3+2',
      elo: 1450
    },
    {
      id: 'bob',
      name: 'BobbyFisherPrice',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Bob',
      status: 'online',
      elo: 1200
    },
    {
      id: 'charlie',
      name: 'CheckMate_Pro',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Charlie',
      status: 'offline',
      elo: 1890
    },
    {
      id: 'dave',
      name: 'DaveTheRook',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Dave',
      status: 'online',
      elo: 800
    }
  ]);

  friendRequests = signal<{ id: string; name: string; avatar: string }[]>([
    {
      id: 'eve',
      name: 'Eve_Opening',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Eve'
    }
  ]);

  // Map of FriendID -> Messages[]
  private messages = signal<Map<string, ChatMessage[]>>(new Map());

  // Current Profile being viewed
  viewedProfile = signal<UserProfile | null>(null);

  constructor() {
    // Mock initial messages
    const m = new Map();
    m.set('alice', [
      {
        senderId: 'alice',
        text: 'Bien joué pour la dernière partie !',
        timestamp: Date.now() - 100000
      },
      { senderId: 'me', text: "Merci, c'était serré.", timestamp: Date.now() - 90000 }
    ]);
    this.messages.set(m);
  }

  // --- Profile Logic ---
  loadProfile(userId: string) {
    // Mock Data Fetching
    const isMe = userId === this.auth.currentUser()?.id;

    const profile: UserProfile = {
      id: userId,
      name: isMe
        ? this.auth.currentUser()!.name
        : this.friends().find((f) => f.id === userId)?.name || 'Unknown Player',
      avatar: isMe
        ? this.auth.currentUser()!.avatar
        : this.friends().find((f) => f.id === userId)?.avatar ||
          `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`,
      bio: "Passionné d'échecs tactiques et de gambits douteux.",
      joinedAt: Date.now() - 100000000,
      stats: {
        bullet: 1150 + Math.floor(Math.random() * 200),
        blitz: 1200 + Math.floor(Math.random() * 300),
        rapid: 1400 + Math.floor(Math.random() * 100),
        classical: 1500
      },
      badges: [
        {
          id: '1',
          icon: '🔥',
          name: 'On Fire',
          description: 'Gagné 5 parties de suite',
          unlockedAt: Date.now()
        },
        {
          id: '2',
          icon: '🛡️',
          name: 'Mur de Brique',
          description: 'Nulle contre un joueur +200 ELO',
          unlockedAt: Date.now()
        },
        {
          id: '3',
          icon: '🎓',
          name: 'Apprenti',
          description: 'Complété le tutoriel',
          unlockedAt: Date.now()
        }
      ],
      recentGames: [] // Populated by history service in real app
    };

    this.viewedProfile.set(profile);
  }

  // --- Friends Logic ---
  addFriend(username: string) {
    // Simulation
    setTimeout(() => {
      alert(`Demande envoyée à ${username}`);
    }, 500);
  }

  acceptRequest(id: string) {
    const req = this.friendRequests().find((r) => r.id === id);
    if (!req) return;

    const newFriend: Friend = {
      id: req.id,
      name: req.name,
      avatar: req.avatar,
      status: 'online',
      elo: 1200
    };

    this.friends.update((list) => [...list, newFriend]);
    this.friendRequests.update((list) => list.filter((r) => r.id !== id));
  }

  declineRequest(id: string) {
    this.friendRequests.update((list) => list.filter((r) => r.id !== id));
  }

  removeFriend(id: string) {
    this.friends.update((list) => list.filter((f) => f.id !== id));
  }

  // --- Chat Logic ---
  getMessages(friendId: string) {
    return computed(() => this.messages().get(friendId) || []);
  }

  sendMessage(friendId: string, text: string) {
    const currentMap = new Map(this.messages());
    const chat = currentMap.get(friendId) || [];

    const newMessage: ChatMessage = {
      senderId: 'me',
      text,
      timestamp: Date.now()
    };

    currentMap.set(friendId, [...chat, newMessage]);
    this.messages.set(currentMap);

    // Mock reply
    setTimeout(() => {
      const updatedMap = new Map(this.messages());
      const updatedChat = updatedMap.get(friendId) || [];
      updatedMap.set(friendId, [
        ...updatedChat,
        {
          senderId: friendId,
          text: 'OK, on joue quand ?',
          timestamp: Date.now()
        }
      ]);
      this.messages.set(updatedMap);
    }, 3000);
  }
}
