
import { Injectable, signal, computed } from '@angular/core';
import { GameConfig } from './chess-logic.service';

export interface MultiplayerRoom {
  id: string;
  hostName: string;
  hostAvatar: string;
  hostElo: number;
  config: GameConfig;
  status: 'waiting' | 'full' | 'playing';
  players: {
    id: string;
    name: string;
    avatar: string;
    isReady: boolean;
    side: 'w' | 'b';
  }[];
  messages: { sender: string, text: string }[];
  isPrivate: boolean;
}

export type ConnectionStatus = 'excellent' | 'good' | 'poor' | 'offline';

@Injectable({
  providedIn: 'root'
})
export class MultiplayerService {
  // Global State
  rooms = signal<MultiplayerRoom[]>([]);
  currentRoom = signal<MultiplayerRoom | null>(null);
  isMatchmaking = signal(false);
  
  // Connection Simulation
  latency = signal<number>(25); // ms
  connectionStatus = computed<ConnectionStatus>(() => {
      const lat = this.latency();
      if (lat < 0) return 'offline';
      if (lat < 100) return 'excellent';
      if (lat < 300) return 'good';
      return 'poor';
  });

  constructor() {
      // Mock initial rooms
      this.rooms.set([
          this.createMockRoom('Alice', 1250, 5, 0),
          this.createMockRoom('Bob_The_Master', 1500, 3, 2),
          this.createMockRoom('ChessViking', 900, 10, 0),
      ]);

      // Simulate Ping variation
      setInterval(() => {
          // Fluctuate latency
          const variation = Math.random() * 50 - 25;
          let newLat = Math.max(10, this.latency() + variation);
          
          // Random spikes
          if (Math.random() > 0.95) newLat += 300; 
          
          this.latency.set(Math.floor(newLat));
      }, 2000);
  }

  // --- ACTIONS ---

  startMatchmaking(config: { mode: string }) {
      this.isMatchmaking.set(true);
      return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
              this.isMatchmaking.set(false);
              
              // 10% chance of timeout error
              if (Math.random() > 0.9) {
                  reject(new Error("Aucun adversaire trouvé. Réessayez."));
                  return;
              }

              // Create a room with a "found" opponent
              const room = this.createMockRoom('Online_Opponent', 1300, 5, 0);
              room.players.push({
                  id: 'me',
                  name: 'Moi',
                  avatar: '', // filled by UI
                  isReady: true,
                  side: 'w'
              });
              room.status = 'playing'; // Direct start
              this.currentRoom.set(room);
              resolve();
          }, 3000);
      });
  }

  createRoom(config: GameConfig, isPrivate: boolean, hostName: string, hostAvatar: string, hostElo: number): string {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const room: MultiplayerRoom = {
          id: roomId,
          hostName,
          hostAvatar,
          hostElo,
          config,
          status: 'waiting',
          players: [{
              id: 'host',
              name: hostName,
              avatar: hostAvatar,
              isReady: false,
              side: 'w' // Default
          }],
          messages: [],
          isPrivate
      };
      
      this.currentRoom.set(room);
      if (!isPrivate) {
          this.rooms.update(r => [room, ...r]);
      }
      return roomId;
  }

  joinRoom(roomId: string, playerName: string, playerAvatar: string) {
      const room = this.rooms().find(r => r.id === roomId) || (this.currentRoom()?.id === roomId ? this.currentRoom() : null);
      
      if (!room) throw new Error("Salon introuvable");
      if (room.status !== 'waiting') throw new Error("Le salon est complet ou la partie a commencé");

      const updatedRoom = { ...room };
      updatedRoom.players = [...updatedRoom.players, {
          id: 'guest',
          name: playerName,
          avatar: playerAvatar,
          isReady: false,
          side: updatedRoom.players[0].side === 'w' ? 'b' : 'w'
      }];
      updatedRoom.status = 'full';

      this.currentRoom.set(updatedRoom);
      
      // Update global list if public
      if (!updatedRoom.isPrivate) {
         this.rooms.update(rooms => rooms.map(r => r.id === roomId ? updatedRoom : r));
      }
  }

  leaveRoom() {
      const current = this.currentRoom();
      if (current && !current.isPrivate) {
          // Remove me from room logic (simplified)
          this.rooms.update(rooms => rooms.filter(r => r.id !== current.id)); 
      }
      this.currentRoom.set(null);
  }

  toggleReady() {
      const room = this.currentRoom();
      if (!room) return;
      
      // Toggle "Me" (assuming last player added is local for this demo context)
      const myIndex = room.players.length - 1; 
      const updatedPlayers = [...room.players];
      updatedPlayers[myIndex] = { ...updatedPlayers[myIndex], isReady: !updatedPlayers[myIndex].isReady };
      
      // Check auto-start
      let newStatus = room.status;
      if (updatedPlayers.length === 2 && updatedPlayers.every(p => p.isReady)) {
           newStatus = 'playing';
      }

      const updatedRoom = { ...room, players: updatedPlayers, status: newStatus };
      this.currentRoom.set(updatedRoom);
  }

  sendMessage(text: string, sender: string) {
      const room = this.currentRoom();
      if (!room) return;
      
      const updatedRoom = { 
          ...room, 
          messages: [...room.messages, { sender, text }] 
      };
      this.currentRoom.set(updatedRoom);
  }

  // --- HELPERS ---
  private createMockRoom(hostName: string, hostElo: number, time: number, inc: number): MultiplayerRoom {
      return {
          id: Math.random().toString(36).substring(7).toUpperCase(),
          hostName,
          hostAvatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${hostName}`,
          hostElo,
          config: { timeMinutes: time, incrementSeconds: inc, opponentCount: 1, difficulty: 'pvp' },
          status: 'waiting',
          players: [{
              id: 'host',
              name: hostName,
              avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${hostName}`,
              isReady: true,
              side: Math.random() > 0.5 ? 'w' : 'b'
          }],
          messages: [],
          isPrivate: false
      };
  }
}
