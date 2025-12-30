
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
        <div class="ui-card p-8">
            
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
                    <label class="ui-label block mb-2 font-display">
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
                         <label class="ui-label block mb-2 font-display">Temps initial (min)</label>
                         <div class="flex space-x-2">
                             <button (click)="timeMinutes.set(10)" [class.bg-[#1D1C1C]]="timeMinutes() === 10" [class.text-white]="timeMinutes() === 10" class="ui-btn ui-btn-ghost flex-1 py-2 font-bold">10</button>
                             <button (click)="timeMinutes.set(20)" [class.bg-[#1D1C1C]]="timeMinutes() === 20" [class.text-white]="timeMinutes() === 20" class="ui-btn ui-btn-ghost flex-1 py-2 font-bold">20</button>
                             <button (click)="timeMinutes.set(40)" [class.bg-[#1D1C1C]]="timeMinutes() === 40" [class.text-white]="timeMinutes() === 40" class="ui-btn ui-btn-ghost flex-1 py-2 font-bold">40</button>
                         </div>
                    </div>
                    <div>
                         <label class="ui-label block mb-2 font-display">Incrément (sec)</label>
                         <input type="number" [(ngModel)]="incrementSeconds" class="ui-input font-bold">
                    </div>
                </div>

                <div class="ui-card-header p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p class="text-sm font-black uppercase text-[#1D1C1C]">Preset Hydra</p>
                        <p class="text-xs font-bold text-gray-700">Cadence recommandée 5 min + 3s, scoring +3 / +1 / -1.</p>
                    </div>
                    <button (click)="useHydraPreset()" class="ui-btn ui-btn-dark px-4 py-2">Appliquer 5+3</button>
                </div>

                <!-- Theme / Options -->
                <div>
                     <label class="ui-label block mb-2 font-display">Visibilité</label>
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
                    <button (click)="launchSimul()" class="ui-btn ui-btn-secondary w-full py-4 text-xl font-black font-display">
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

  useHydraPreset() {
      this.timeMinutes.set(5);
      this.incrementSeconds.set(3);
  }

  launchSimul() {
      this.start.emit({
          opponentCount: this.opponentCount(),
          timeMinutes: this.timeMinutes(),
          incrementSeconds: this.incrementSeconds(),
          difficulty: 'pvp'
      });
  }
}
