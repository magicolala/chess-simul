import { Component, effect, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiplayerService } from '../services/multiplayer.service';

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (mpService.currentRoom(); as room) {
      <div class="h-full max-w-5xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 font-sans">
        <!-- LEFT: Players & Status -->
        <div class="flex-1 space-y-8">
          <!-- Room Info Header -->
          <div class="ui-card p-6">
            <div class="flex justify-between items-start mb-4">
              <h2
                class="text-3xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter"
              >
                Salon de jeu
              </h2>
              <button (click)="leave()" class="ui-btn ui-btn-ghost text-xs px-2 py-1 text-red-500">
                Quitter
              </button>
            </div>

            <div class="flex items-center space-x-4 mb-4">
              <div
                class="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-[2px] border border-gray-300 dark:border-gray-600"
              >
                <span class="text-xl">⏱</span>
                <span class="font-mono font-bold"
                  >{{ room.config.timeMinutes }}+{{ room.config.incrementSeconds }}</span
                >
              </div>
              <div
                class="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-[2px] border border-gray-300 dark:border-gray-600"
              >
                <span class="text-xl">🔒</span>
                <span class="font-bold text-sm uppercase">{{
                  room.isPrivate ? 'Privé' : 'Public'
                }}</span>
              </div>
            </div>

            @if (room.isPrivate) {
              <div
                class="flex items-center space-x-2 bg-[#FFF48D] p-2 border border-[#1D1C1C] text-sm"
              >
                <span class="font-bold">Code:</span>
                <code class="font-mono font-bold text-lg select-all">{{ room.id }}</code>
                <span class="text-[10px] text-gray-500 ml-auto uppercase font-bold"
                  >Copier pour inviter</span
                >
              </div>
            }
          </div>

          <!-- Players List -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (player of room.players; track player.id) {
              <div
                class="ui-card p-6 flex flex-col items-center justify-center relative transition-all"
                [class.border-[#1D1C1C]]="!player.isReady"
                [class.border-green-500]="player.isReady"
                [class.dark:border-green-400]="player.isReady"
                [class.dark:border-white]="!player.isReady"
              >
                @if (player.isReady) {
                  <div
                    class="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black uppercase px-2 py-0.5"
                  >
                    Prêt
                  </div>
                } @else {
                  <div
                    class="absolute top-2 right-2 bg-gray-200 text-gray-500 text-[10px] font-black uppercase px-2 py-0.5"
                  >
                    Attente
                  </div>
                }

                <div
                  class="w-20 h-20 rounded-full border-4 border-[#1D1C1C] dark:border-white overflow-hidden mb-3 bg-gray-100"
                >
                  <img [src]="player.avatar" class="w-full h-full object-cover" />
                </div>
                <h3 class="text-lg font-black font-display uppercase truncate max-w-full">
                  {{ player.name }}
                </h3>
                <div class="mt-2 flex space-x-2">
                  <span
                    class="w-4 h-4 border border-black"
                    [class.bg-white]="player.side === 'w'"
                    [class.bg-black]="player.side === 'b'"
                  ></span>
                  <span class="text-xs font-bold text-gray-500 uppercase">{{
                    player.side === 'w' ? 'Blancs' : 'Noirs'
                  }}</span>
                </div>
              </div>
            }

            <!-- Empty Slot Placeholder -->
            @if (room.players.length < 2) {
              <div
                class="border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-gray-400"
              >
                <div class="text-4xl mb-2 opacity-50">?</div>
                <p class="font-bold text-sm uppercase">En attente...</p>
              </div>
            }
          </div>

          <!-- Ready Button -->
          <button
            (click)="mpService.toggleReady()"
            class="ui-btn w-full py-4 text-xl font-black font-display"
            [class.bg-[#1D1C1C]]="isMeReady()"
            [class.text-white]="isMeReady()"
            [class.bg-[#7AF7F7]]="!isMeReady()"
            [class.text-[#1D1C1C]]="!isMeReady()"
          >
            {{ isMeReady() ? 'Annuler' : 'Je suis prêt !' }}
          </button>
        </div>

        <!-- RIGHT: Chat -->
        <div class="ui-card w-full md:w-80 flex flex-col">
          <div class="ui-card-header p-3">
            <h3 class="text-xs font-black uppercase text-gray-500">Chat du salon</h3>
          </div>

          <div class="flex-1 p-4 space-y-3 overflow-y-auto min-h-[300px]">
            @for (msg of room.messages; track $index) {
              <div class="flex flex-col items-start">
                <div
                  class="bg-gray-100 dark:bg-gray-800 p-2 rounded-[2px] text-xs font-medium border border-gray-200 dark:border-gray-700"
                >
                  <span class="font-bold text-[#1D1C1C] dark:text-gray-300 mr-1"
                    >{{ msg.sender }}:</span
                  >
                  <span class="text-gray-600 dark:text-gray-400">{{ msg.text }}</span>
                </div>
              </div>
            }
            @if (room.messages.length === 0) {
              <p class="text-center text-xs text-gray-400 italic mt-10">Dites bonjour !</p>
            }
          </div>

          <div class="ui-card-footer p-2">
            <div class="flex space-x-2">
              <input
                [(ngModel)]="chatMsg"
                (keyup.enter)="send()"
                type="text"
                placeholder="..."
                class="ui-input text-sm"
              />
              <button (click)="send()" class="ui-btn ui-btn-dark px-3 text-xs">></button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class GameRoomComponent {
  mpService = inject(MultiplayerService);
  gameStarted = output<void>();
  goBack = output<void>();

  chatMsg = signal('');

  // Helper to determine if "I" am ready.
  // In this simple demo, we assume the last player is "Me" or we check ready status of player[1] if joined, etc.
  // For robustness, let's assume we toggle the state and the UI reflects the room state.
  isMeReady = computed(() => {
    const room = this.mpService.currentRoom();
    if (!room) {
      return false;
    }
    // Simple heuristic for demo: If I created, I am index 0. If I joined, I am index 1.
    // But mpService handles toggle logic abstractly. We just check if *someone* is ready for visual feedback or check last added.
    // Better: Check if ALL are ready to auto-start.

    // Let's just track the last player's status for the button state
    return room.players[room.players.length - 1].isReady;
  });

  constructor() {
    // Auto-start effect
    effect(
      () => {
        const room = this.mpService.currentRoom();
        if (room && room.status === 'playing') {
          this.gameStarted.emit();
        }
      },
      { allowSignalWrites: true }
    );
  }

  send() {
    if (this.chatMsg().trim()) {
      this.mpService.sendMessage(this.chatMsg(), 'Moi');
      this.chatMsg.set('');
    }
  }

  leave() {
    this.mpService.leaveRoom();
    this.goBack.emit();
  }
}
