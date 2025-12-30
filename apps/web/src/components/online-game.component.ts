
import { Component, inject, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from './chess-board.component';
import { ChessSimulService } from '../services/chess-logic.service';
import { MultiplayerService } from '../services/multiplayer.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-online-game',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    @if (game()) {
        <div class="h-full flex flex-col md:flex-row max-w-7xl mx-auto md:p-4 gap-4 font-sans relative">
            
            <!-- Connection Status Banner -->
            @if (mpService.connectionStatus() === 'poor' || mpService.connectionStatus() === 'offline') {
                <div class="absolute top-0 left-0 w-full z-30 bg-red-500 text-white text-xs font-bold uppercase text-center py-1 animate-pulse">
                    ⚠️ Connexion Instable ({{ mpService.latency() }}ms) - Tentative de reconnexion...
                </div>
            }

            <!-- LEFT: Board Area -->
            <div class="flex-1 flex flex-col">
                <!-- Top Player (Opponent) -->
                <div class="ui-card p-2 mb-2 flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <img [src]="game()!.opponentAvatar" class="w-10 h-10 border border-[#1D1C1C] dark:border-white rounded-full">
                        <div>
                            <div class="flex items-center space-x-2">
                                <p class="font-bold text-sm text-[#1D1C1C] dark:text-white leading-none">{{ game()!.opponentName }}</p>
                                <!-- Ping Dot -->
                                <div class="w-2 h-2 rounded-full" 
                                     [class.bg-green-500]="mpService.connectionStatus() === 'excellent'"
                                     [class.bg-yellow-500]="mpService.connectionStatus() === 'good'"
                                     [class.bg-red-500]="mpService.connectionStatus() === 'poor' || mpService.connectionStatus() === 'offline'">
                                </div>
                            </div>
                            <p class="text-[10px] font-mono text-gray-500">{{ game()!.opponentRating }}</p>
                        </div>
                    </div>
                    <div class="font-mono text-xl font-black px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-[2px]"
                         [class.bg-green-100]="game()!.turn === 'b'"
                         [class.text-red-600]="game()!.blackTime < 30000">
                        {{ formatTime(game()!.blackTime) }}
                    </div>
                </div>

                <!-- BOARD -->
                <div class="flex-1 bg-[#e0e0e0] dark:bg-gray-900 border-2 border-[#1D1C1C] dark:border-white flex items-center justify-center p-2 relative">
                    <div class="w-full max-w-[70vh] aspect-square wero-shadow">
                        <app-chess-board 
                            [fen]="game()!.fen" 
                            [lastMove]="game()!.lastMove"
                            [isInteractive]="game()!.status === 'active' && game()!.turn === 'w'"
                            [allowedColor]="'w'" 
                            [orientation]="'w'"
                            (move)="onMove($event)">
                        </app-chess-board>
                    </div>

                    <!-- Game Over Overlay (Online Specific) -->
                    @if (game()!.status !== 'active' && game()!.status !== 'waiting') {
                        <div class="absolute inset-0 bg-[#1D1C1C]/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in">
                            <h2 class="text-4xl font-black text-white uppercase mb-2">
                                {{ getResultTitle() }}
                            </h2>
                            <p class="text-[#FFF48D] font-bold text-lg mb-6">{{ game()!.systemMessage }}</p>
                            
                            <!-- ELO Change -->
                            <div class="flex items-center space-x-2 text-2xl font-black mb-8">
                                <span class="text-white">ELO:</span>
                                <span [class.text-green-400]="(game()!.eloChange || 0) > 0" 
                                      [class.text-red-400]="(game()!.eloChange || 0) < 0"
                                      [class.text-gray-400]="(game()!.eloChange || 0) === 0">
                                    {{ (game()!.eloChange || 0) > 0 ? '+' : '' }}{{ game()!.eloChange }}
                                </span>
                            </div>

                            <div class="flex space-x-4">
                                <button (click)="leave()" class="px-6 py-3 bg-white text-[#1D1C1C] font-black uppercase border-2 border-white hover:bg-gray-200">Menu Principal</button>
                                <button class="px-6 py-3 bg-[#7AF7F7] text-[#1D1C1C] font-black uppercase border-2 border-[#1D1C1C] wero-shadow hover:bg-[#FFF48D]">Revanche</button>
                            </div>
                        </div>
                    }
                </div>

                <!-- Bottom Player (Me) -->
                <div class="ui-card p-2 mt-2 flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <img [src]="game()!.playerName === 'Joueur 1' ? auth.currentUser()?.avatar : '...'" class="w-10 h-10 border border-[#1D1C1C] dark:border-white rounded-full">
                        <div>
                            <p class="font-bold text-sm text-[#1D1C1C] dark:text-white leading-none">{{ auth.currentUser()?.name }}</p>
                            <p class="text-[10px] font-mono text-gray-500">1200</p>
                        </div>
                    </div>
                    <div class="font-mono text-xl font-black px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-[2px]"
                         [class.bg-green-100]="game()!.turn === 'w'"
                         [class.text-red-600]="game()!.whiteTime < 30000">
                        {{ formatTime(game()!.whiteTime) }}
                    </div>
                </div>
            </div>

            <!-- RIGHT: Controls & Chat -->
            <div class="ui-card w-full md:w-80 flex flex-col">
                
                <!-- Chat History -->
                <div class="flex-1 bg-gray-50 dark:bg-[#121212] p-4 overflow-y-auto space-y-2 min-h-[200px]">
                    <div class="text-center text-[10px] font-bold text-gray-400 uppercase mb-4">Début de partie</div>
                    @for (msg of game()!.chat; track msg.id) {
                        <div class="flex flex-col" [class.items-end]="msg.isSelf" [class.items-start]="!msg.isSelf">
                             <div class="max-w-[85%] p-2 border-2 border-[#1D1C1C] text-xs font-medium"
                                  [class.bg-[#FFF48D]]="msg.isSelf"
                                  [class.text-[#1D1C1C]]="msg.isSelf"
                                  [class.bg-white]="!msg.isSelf"
                                  [class.dark:bg-[#1a1a1a]]="!msg.isSelf"
                                  [class.dark:text-white]="!msg.isSelf">
                                 {{ msg.text }}
                             </div>
                        </div>
                    }
                </div>

                <!-- Chat Input -->
                <div class="ui-card-footer p-2">
                     <div class="flex space-x-2">
                         <input type="text" [(ngModel)]="chatInput" (keyup.enter)="sendChat()" placeholder="Message..." 
                            class="ui-input text-xs">
                         <button (click)="sendChat()" class="ui-btn ui-btn-dark px-3 text-xs">
                             >
                         </button>
                     </div>
                </div>

                <!-- Game Actions -->
                <div class="p-4 grid grid-cols-2 gap-3 bg-gray-100 dark:bg-[#0f0f0f]">
                    <button (click)="offerDraw()" class="ui-btn ui-btn-ghost py-3 text-xs text-gray-700">
                        ½ Nulle
                    </button>
                    <button (click)="resign()" class="ui-btn ui-btn-ghost py-3 text-xs text-red-600">
                        🏳 Abandon
                    </button>
                </div>
                
                <!-- Report/Block (Bottom) -->
                <div class="p-2 flex justify-between bg-white dark:bg-[#1a1a1a] border-t-2 border-[#1D1C1C] dark:border-gray-800">
                    <button (click)="report()" class="text-[10px] text-gray-400 hover:text-red-500 uppercase font-bold">Signaler</button>
                    <button (click)="block()" class="text-[10px] text-gray-400 hover:text-red-500 uppercase font-bold">Bloquer</button>
                </div>

            </div>

        </div>
    }
  `
})
export class OnlineGameComponent {
  logic = inject(ChessSimulService);
  mpService = inject(MultiplayerService);
  auth = inject(AuthService);
  
  leaveGame = output<void>();

  // Assuming only 1 game active in logic service for this view
  game = computed(() => {
    const allGames = this.logic.games();
    return allGames.length > 0 ? allGames[0] : null;
  });
  chatInput = signal('');

  constructor() {
      // Initialize a game based on the lobby room configuration
      const room = this.mpService.currentRoom();
      const user = this.auth.currentUser();
      
      if (room && user) {
          const opponent = room.players.find(p => p.id !== user.id); // Find opponent by ID, not name, for robustness
          const playerInRoom = room.players.find(p => p.id === user.id); // Find current player in room

          const playerColor = playerInRoom ? playerInRoom.side : 'w'; // Default to 'w' if not found
          const opponentColor = playerColor === 'w' ? 'b' : 'w';

          this.logic.startPvpSession(room.config, 'online', {
              opponentName: opponent ? opponent.name : 'Adversaire',
              opponentAvatar: opponent ? opponent.avatar : '',
              playerName: user.name,
              systemMessage: 'Partie classée commencée.',
              playerColor: playerColor,
              opponentColor: opponentColor
          });
      }
  }

  onMove(move: {from: string, to: string}) {
      if (this.game()) {
          this.logic.makeMove(this.game()!.id, move.from, move.to);
      }
  }

  sendChat() {
      if (this.game() && this.chatInput().trim()) {
          this.logic.sendChatMessage(this.game()!.id, this.chatInput());
          this.chatInput.set('');
      }
  }

  resign() {
      if (this.game()) {
          if(!confirm("Êtes-vous sûr de vouloir abandonner ?")) return;
          this.logic.resign(this.game()!.id);
      }
  }

  offerDraw() {
      if (this.game()) {
          this.logic.offerDraw(this.game()!.id);
      }
  }

  leave() {
      this.leaveGame.emit();
  }

  report() {
      alert("Signalement envoyé à la modération.");
  }

  block() {
      if(confirm(`Bloquer ${this.game()!.opponentName} ? Vous ne serez plus jumelés.`)) {
          alert("Joueur bloqué.");
      }
  }

  formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getResultTitle() {
      const g = this.game();
      if (!g) return '';
      const isPlayerWhite = g.playerColor === 'w';

      if (g.status === 'checkmate') {
          // If it's black's turn to move and they are checkmated, white won.
          // If it's white's turn to move and they are checkmated, black won.
          const winnerColor = g.turn === 'b' ? 'w' : 'b';
          return winnerColor === g.playerColor ? 'Victoire !' : 'Défaite';
      }
      if (g.status === 'resigned') {
           // If the player's color matches the resignedBy color, it's a defeat.
           return g.resignedBy === g.playerColor ? 'Défaite' : 'Victoire !';
      }
      if (g.status === 'timeout') {
          // If whiteTime is 0 and player is white, it's a defeat.
          // If blackTime is 0 and player is black, it's a defeat.
          if ((isPlayerWhite && g.whiteTime === 0) || (!isPlayerWhite && g.blackTime === 0)) {
              return 'Temps écoulé (Déf)';
          } else {
              return 'Temps écoulé (Vic)';
          }
      }
      return 'Match Nul';
  }
}
