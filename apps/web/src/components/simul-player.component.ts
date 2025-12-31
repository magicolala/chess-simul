
import { Component, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from './chess-board.component';
import { ChessSimulService } from '../services/chess-logic.service';
import { SimulService } from '../services/simul.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-simul-player',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    @if (game()) {
        <div class="h-full flex flex-col items-center justify-center p-4 font-sans max-w-5xl mx-auto">
            
            <!-- Banner -->
            <div class="ui-card bg-[#1D1C1C] text-white p-4 mb-4 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <img [src]="simulService.currentSimul()?.host?.avatar" class="w-12 h-12 rounded-full border-2 border-white bg-white">
                    <div>
                        <h2 class="text-xl font-black font-display uppercase leading-none">Simultanée vs {{ simulService.currentSimul()?.host?.name }}</h2>
                        <p class="text-xs text-gray-400 font-mono mt-1">Vous jouez les Noirs</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-black font-mono" [class.text-[#FFF48D]]="game()!.turn === 'b'">{{ formatTime(game()!.blackTime) }}</div>
                </div>
            </div>

            <!-- Main Game Area -->
            <div class="ui-card p-6 w-full gap-8 flex flex-col md:flex-row relative">
                
                <!-- Status Overlay (When host turn) -->
                @if (game()!.turn === 'w' && game()!.status === 'active') {
                    <div class="absolute inset-0 z-20 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none">
                        <div class="ui-card bg-[#1D1C1C] text-white px-6 py-3 border-2 border-white animate-pulse">
                            <p class="font-black uppercase text-lg">Tour de l'hôte...</p>
                        </div>
                    </div>
                }

                <!-- Board -->
                <div class="flex-1 flex justify-center">
                    <div class="w-full max-w-[60vh] aspect-square wero-shadow">
                        <app-chess-board 
                            [fen]="game()!.fen" 
                            [lastMove]="game()!.lastMove"
                            [isInteractive]="game()!.status === 'active' && game()!.turn === 'b'"
                            [allowedColor]="'b'"
                            [orientation]="'b'"
                            (move)="onMove($event)">
                        </app-chess-board>
                    </div>
                </div>

                <!-- Sidebar info -->
                <div class="w-full md:w-64 flex flex-col space-y-4">
                    
                    <!-- Last Move -->
                    <div class="ui-card p-4 bg-gray-50 dark:bg-[#121212]">
                        <p class="text-xs font-bold text-gray-500 uppercase mb-1">Dernier coup</p>
                        <p class="text-xl font-mono font-black text-[#1D1C1C] dark:text-white">
                            {{ game()!.history[game()!.history.length - 1] || '-' }}
                        </p>
                    </div>

                    <!-- Chat (Read only mostly for simuls usually, but let's allow send) -->
                    <div class="ui-card flex-1 flex flex-col h-64">
                         <div class="ui-card-header bg-[#1D1C1C] text-white text-xs font-bold uppercase p-2">Chat avec l'hôte</div>
                         <div class="flex-1 p-2 overflow-y-auto space-y-2 bg-white dark:bg-[#0f0f0f]">
                             @for (msg of game()!.chat; track msg.id) {
                                 <div class="text-xs">
                                     <span class="font-bold">{{ msg.sender }}:</span> {{ msg.text }}
                                 </div>
                             }
                         </div>
                         <input type="text" (keyup.enter)="sendChat($event)" placeholder="Message..." class="ui-input-top text-xs">
                    </div>

                    <button (click)="resign()" class="ui-btn ui-btn-ghost w-full py-3 text-sm text-red-600">Abandonner</button>
                    <button (click)="quit.emit()" class="ui-btn ui-btn-ghost w-full py-3 text-sm text-gray-500">Quitter</button>

                </div>

            </div>
        </div>
    }
  `
})
export class SimulPlayerComponent {
  logic = inject(ChessSimulService);
  simulService = inject(SimulService);
  auth = inject(AuthService);
  
  quit = output<void>();

  // In Simul Player Mode, we are essentially playing Game ID 0 of a specific session type
  // But logic service handles 'simul-host' vs 'pvp'.
  // For simplicity, we re-use Pvp session logic but mapped to specific user context in a real backend.
  // Here we mock it: The logic service has "games()". If we are player, we find our game.
  // We assume logic service has been initialized with just 1 game (us vs host) by the Join action.
  game = computed(() => this.logic.games()[0]);

  constructor() {
     // Initialize game state for player
     // In a real app, we'd fetch the game state from the simul ID
     const simul = this.simulService.currentSimul();
     if (simul) {
        this.logic.startPvpSession(simul.config, 'online', {
            mode: 'simul-player',
            opponentName: simul.host.name,
            opponentAvatar: simul.host.avatar,
            opponentRating: simul.host.elo,
            isHostTurn: true, // Host starts
            turn: 'w',
            playerName: this.auth.currentUser()?.name || 'Moi'
        });
     }
  }

  onMove(move: {from: string, to: string}) {
      if (this.game()) {
          this.logic.makeMove(this.game()!.id, move.from, move.to);
      }
  }

  sendChat(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.value.trim() && this.game()) {
          this.logic.sendChatMessage(this.game()!.id, input.value);
          input.value = '';
      }
  }

  resign() {
      if (this.game()) {
          this.logic.resign(this.game()!.id);
      }
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
