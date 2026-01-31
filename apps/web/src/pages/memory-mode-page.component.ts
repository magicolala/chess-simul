import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MemoryGameService } from '../services/memory-game.service';
import { ChessBoardComponent } from '../components/chess-board.component';

@Component({
  selector: 'app-memory-mode-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent],
  template: `
    <div class="min-h-screen bg-nano-banana flex flex-col font-sans text-[#1D1C1C]">
      <!-- Header -->
      <header class="bg-white border-b-2 border-[#1D1C1C] px-6 py-4 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-3xl font-black font-display hover:text-gray-600 transition-colors">
              CHESS MASTER
            </a>
            <div class="h-8 w-0.5 bg-[#1D1C1C] hidden md:block"></div>
            <h1 class="text-xl font-bold uppercase hidden md:block">Mode Mémoire</h1>
          </div>
          
          <!-- Timer Display -->
          <div class="font-mono text-xl font-bold bg-[#1D1C1C] text-[#FFF48D] px-4 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
             {{ formatTime(state().timer) }}
          </div>

          <div class="flex items-center gap-4">
             <div *ngIf="state().status !== 'start'" class="bg-[#FFF48D] border-2 border-[#1D1C1C] px-3 py-1 font-bold shadow-[2px_2px_0px_#1D1C1C]">
               <span *ngIf="state().mode === 'solo'">Vies : {{ state().lives }} / 3</span>
               <span *ngIf="state().mode === 'duel'">
                 J{{state().duelState?.currentPlayer}} : {{ state().lives }} ❤
               </span>
             </div>
             <button class="ui-btn ui-btn-dark px-4 py-2 text-sm" (click)="resetGame()">
                Menu
             </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col items-center justify-center p-4 gap-8">
        
        <!-- Game Status / Feedback -->
        <div *ngIf="state().status !== 'start'" class="text-center space-y-2 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <h2 class="text-3xl font-black font-display uppercase tracking-tight">
             {{ state().currentGame?.white }} vs {{ state().currentGame?.black }}
          </h2>
          <p class="text-gray-600 font-medium">
             {{ state().currentGame?.event }} ({{ state().currentGame?.date }})
          </p>
          
          <div class="mt-4 p-4 ui-card bg-white/90 backdrop-blur border-2 border-[#1D1C1C] transition-all duration-300"
               [ngClass]="{
                 'bg-red-100': state().feedbackMessage.includes('Mauvais'),
                 'bg-green-100': state().feedbackMessage.includes('Bien joué'),
                 'bg-[#FFF48D]': state().status === 'won' || state().status === 'duel_result'
               }">
            <p class="text-xl font-bold font-display uppercase">
               {{ state().feedbackMessage }}
            </p>
            <p class="text-sm font-medium mt-1" *ngIf="state().status === 'playing'">
               Coup {{ Math.floor(state().currentMoveIndex / 2) + 1 }}
            </p>
          </div>
        </div>

        <!-- Start Screen -->
        <div *ngIf="state().status === 'start'" class="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Solo Mode -->
            <div class="ui-card p-8 bg-white border-2 border-[#1D1C1C] hover:shadow-[8px_8px_0px_#1D1C1C] transition-all cursor-pointer group"
                 (click)="startSolo()">
                <div class="text-5xl mb-4 group-hover:scale-110 transition-transform">👤</div>
                <h2 class="text-3xl font-black font-display uppercase mb-2">Solo</h2>
                <p class="text-gray-600 font-medium">Testez votre mémoire avec 3 vies. Objectif : 20 coups.</p>
                <button class="mt-6 ui-btn ui-btn-primary w-full font-bold">Jouer en Solo</button>
            </div>

            <!-- Duel Mode -->
            <div class="ui-card p-8 bg-[#FFF48D] border-2 border-[#1D1C1C] hover:shadow-[8px_8px_0px_#1D1C1C] transition-all cursor-pointer group"
                 (click)="startDuel()">
                <div class="text-5xl mb-4 group-hover:scale-110 transition-transform">⚔️</div>
                <h2 class="text-3xl font-black font-display uppercase mb-2">Duel (Hotseat)</h2>
                <p class="text-gray-800 font-medium">Affrontez un ami sur le même écran. Qui aura la meilleure mémoire ?</p>
                <button class="mt-6 ui-btn ui-btn-dark w-full font-bold">Défier un ami</button>
            </div>
        </div>

        <!-- Board Area -->
        <div *ngIf="state().status !== 'start'" class="w-full max-w-[600px] aspect-square relative ui-card p-2 bg-white border-2 border-[#1D1C1C]">
           <app-chess-board
             [fen]="currentFen()"
             [isInteractive]="state().status === 'playing'"
             [orientation]="'w'"
             [allowedColor]="'both'"
             (move)="onMove($event)"
           ></app-chess-board>
           
           <!-- Overlay for Game Over / Intermission -->
           <div *ngIf="state().status !== 'playing' && state().status !== 'memorizing'" 
                class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded">
              
              <!-- Standard Result -->
              <div *ngIf="state().status === 'won' || state().status === 'lost'" 
                   class="bg-white border-4 border-[#1D1C1C] p-8 text-center shadow-[8px_8px_0px_#1D1C1C] animate-in zoom-in duration-300">
                  <p class="text-6xl mb-4">
                    {{ state().status === 'won' ? '🏆' : '💀' }}
                  </p>
                  <h3 class="text-4xl font-black font-display uppercase mb-2">
                    {{ state().status === 'won' ? 'Victoire !' : 'Game Over' }}
                  </h3>
                  <p class="text-xl font-bold font-mono mb-4 bg-gray-100 p-2 rounded">
                      Temps : {{ formatTime(state().timer) }}
                  </p>
                  <button class="ui-btn ui-btn-secondary w-full py-4 text-xl font-black mt-6" (click)="resetGame()">
                     Rejouer
                  </button>
              </div>

               <!-- Duel Intermission -->
               <div *ngIf="state().status === 'duel_intermission'" 
                   class="bg-white border-4 border-[#1D1C1C] p-8 text-center shadow-[8px_8px_0px_#1D1C1C] animate-in zoom-in duration-300 max-w-sm">
                  <p class="text-6xl mb-4">🔄</p>
                  <h3 class="text-3xl font-black font-display uppercase mb-2">
                    Changement de Joueur
                  </h3>
                  <p class="text-gray-600 font-bold mb-6">
                    Passez l'appareil au Joueur 2.
                    Le plateau sera réinitialisé.
                  </p>
                  <button class="ui-btn ui-btn-primary w-full py-4 text-xl font-black" (click)="continueDuel()">
                     C'est parti J2 !
                  </button>
              </div>

              <!-- Duel Result -->
              <div *ngIf="state().status === 'duel_result'" 
                   class="bg-[#FFF48D] border-4 border-[#1D1C1C] p-8 text-center shadow-[8px_8px_0px_#1D1C1C] animate-in zoom-in duration-300 max-w-md">
                  <p class="text-6xl mb-4">🏆</p>
                  <h3 class="text-3xl font-black font-display uppercase mb-4">
                    Résultats du Duel
                  </h3>
                  
                  <div class="grid grid-cols-2 gap-4 mb-6 text-left bg-white p-4 border-2 border-[#1D1C1C]">
                      <div>
                          <p class="text-xs uppercase text-gray-500 font-bold">Joueur 1</p>
                          <p class="text-xl font-black">{{ state().duelState?.p1?.score }} coups</p>
                          <p class="text-sm text-red-500 font-bold">{{ state().duelState?.p1?.lives }} vies</p>
                          <p class="text-sm font-mono bg-gray-100 mt-1 px-1">{{ formatTime(state().duelState?.p1?.time || 0) }}</p>
                      </div>
                      <div class="text-right">
                          <p class="text-xs uppercase text-gray-500 font-bold">Joueur 2</p>
                          <p class="text-xl font-black">{{ state().duelState?.p2?.score }} coups</p>
                          <p class="text-sm text-red-500 font-bold">{{ state().duelState?.p2?.lives }} vies</p>
                          <p class="text-sm font-mono bg-gray-100 mt-1 px-1">{{ formatTime(state().duelState?.p2?.time || 0) }}</p>
                      </div>
                  </div>

                  <p class="text-xl font-black uppercase mb-6 border-b-2 border-[#1D1C1C] pb-4">
                      {{ state().feedbackMessage }}
                  </p>

                  <button class="ui-btn ui-btn-dark w-full py-4 text-xl font-black" (click)="startDuel()">
                     Revanche
                  </button>
                  <button class="mt-2 w-full py-2 text-sm font-bold underline" (click)="resetGame()">
                     Menu Principal
                  </button>
              </div>

           </div>
           
           <!-- Memorization Action Button -->
           <div *ngIf="state().status === 'memorizing'" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
               <button class="ui-btn ui-btn-primary px-8 py-3 text-xl font-black shadow-lg animate-bounce" (click)="skipMemorization()">
                   JE SUIS PRÊT ! 🚀
               </button>
           </div>
        </div>
      </main>
    </div>
  `
})
export class MemoryModePageComponent {
  private memoryService = inject(MemoryGameService);

  Math = Math;

  state = this.memoryService.state;

  currentFen = computed(() => this.state().chess.fen());

  onMove(move: { from: string; to: string }) {
    this.memoryService.makeMove(move.from, move.to);
  }

  startSolo() {
    this.memoryService.startGame('solo');
  }

  startDuel() {
    this.memoryService.startGame('duel');
  }

  continueDuel() {
    this.memoryService.startDuelRound2();
  }

  skipMemorization() {
    this.memoryService.skipMemorization();
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }

  resetGame() {
    this.memoryService.state.update(s => ({
      ...s,
      status: 'start',
      mode: 'solo',
      currentGame: null
    }));
  }
}
