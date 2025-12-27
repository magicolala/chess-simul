
import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameConfig } from '../services/chess-logic.service';

@Component({
  selector: 'app-simul-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto p-8 font-sans animate-in fade-in zoom-in duration-300">
        <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow p-8">
            
            <div class="flex items-center space-x-4 mb-8 pb-8 border-b-2 border-[#1D1C1C] dark:border-gray-700">
                <div class="w-16 h-16 bg-[#FFF48D] flex items-center justify-center text-4xl border-2 border-[#1D1C1C]">
                    ♟
                </div>
                <div>
                    <h2 class="text-3xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter">
                        Organiser une Simultanée
                    </h2>
                    <p class="text-gray-500 font-medium">Vous jouez seul contre plusieurs adversaires.</p>
                </div>
            </div>

            <div class="space-y-8">
                <!-- Opponent Count -->
                <div>
                    <label class="block text-sm font-bold font-display text-gray-500 uppercase mb-2">
                        Nombre d'adversaires : {{ opponentCount() }}
                    </label>
                    <input type="range" min="2" max="20" [(ngModel)]="opponentCount" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1D1C1C]">
                    <div class="flex justify-between text-xs font-bold font-display mt-2 text-gray-400">
                        <span>2 Joueurs</span>
                        <span>20 Joueurs</span>
                    </div>
                </div>

                <!-- Time Control -->
                <div class="grid grid-cols-2 gap-6">
                    <div>
                         <label class="block text-sm font-bold font-display text-gray-500 uppercase mb-2">Temps initial (min)</label>
                         <div class="flex space-x-2">
                             <button (click)="timeMinutes.set(10)" [class.bg-[#1D1C1C]]="timeMinutes() === 10" [class.text-white]="timeMinutes() === 10" class="flex-1 py-2 border-2 border-[#1D1C1C] dark:border-white font-bold hover:bg-gray-100 dark:hover:bg-gray-800">10</button>
                             <button (click)="timeMinutes.set(20)" [class.bg-[#1D1C1C]]="timeMinutes() === 20" [class.text-white]="timeMinutes() === 20" class="flex-1 py-2 border-2 border-[#1D1C1C] dark:border-white font-bold hover:bg-gray-100 dark:hover:bg-gray-800">20</button>
                             <button (click)="timeMinutes.set(40)" [class.bg-[#1D1C1C]]="timeMinutes() === 40" [class.text-white]="timeMinutes() === 40" class="flex-1 py-2 border-2 border-[#1D1C1C] dark:border-white font-bold hover:bg-gray-100 dark:hover:bg-gray-800">40</button>
                         </div>
                    </div>
                    <div>
                         <label class="block text-sm font-bold font-display text-gray-500 uppercase mb-2">Incrément (sec)</label>
                         <input type="number" [(ngModel)]="incrementSeconds" class="w-full p-2 border-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-gray-800 font-bold outline-none">
                    </div>
                </div>

                <!-- Theme / Options -->
                <div>
                     <label class="block text-sm font-bold font-display text-gray-500 uppercase mb-2">Visibilité</label>
                     <div class="flex space-x-4">
                         <label class="flex items-center space-x-2 cursor-pointer">
                             <input type="radio" name="visibility" value="public" checked class="accent-[#1D1C1C] w-4 h-4">
                             <span class="font-bold text-[#1D1C1C] dark:text-white">Publique (Lobby)</span>
                         </label>
                         <label class="flex items-center space-x-2 cursor-pointer">
                             <input type="radio" name="visibility" value="private" class="accent-[#1D1C1C] w-4 h-4">
                             <span class="font-bold text-[#1D1C1C] dark:text-white">Privée (Lien)</span>
                         </label>
                     </div>
                </div>

                <div class="pt-6 border-t-2 border-[#1D1C1C] dark:border-gray-700">
                    <button (click)="launchSimul()" class="w-full py-4 bg-[#7AF7F7] hover:bg-[#FFF48D] text-[#1D1C1C] text-xl font-black font-display border-2 border-[#1D1C1C] wero-shadow-sm uppercase transition-all hover:-translate-y-1">
                        Créer la Simultanée
                    </button>
                </div>
            </div>
        </div>
    </div>
  `
})
export class SimulCreateComponent {
  start = output<GameConfig>();
  
  opponentCount = signal(5);
  timeMinutes = signal(20);
  incrementSeconds = signal(10);

  launchSimul() {
      this.start.emit({
          opponentCount: this.opponentCount(),
          timeMinutes: this.timeMinutes(),
          incrementSeconds: this.incrementSeconds(),
          difficulty: 'pvp'
      });
  }
}
