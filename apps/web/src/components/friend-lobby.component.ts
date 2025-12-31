import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-friend-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="max-w-4xl mx-auto p-4 md:p-8 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div class="text-center mb-12">
        <h2
          class="text-5xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter mb-4"
        >
          Jouer contre un ami
        </h2>
        <p class="text-gray-500 dark:text-gray-400 font-medium text-lg">
          Invitez un joueur pour un défi physique ou partagez le lien.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Create Game Panel -->
        <div class="ui-card p-8 flex flex-col items-center">
          <div
            class="w-16 h-16 bg-[#FFF48D] rounded-full border-2 border-[#1D1C1C] flex items-center justify-center text-3xl mb-6"
          >
            ⚔️
          </div>
          <h3
            class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white uppercase mb-6"
          >
            Créer une partie
          </h3>

          <!-- Time Controls -->
          <div class="w-full space-y-6 mb-8">
            <div>
              <label class="ui-label block mb-2 font-display"
                >Cadence: {{ timeMinutes() }} min</label
              >
              <input
                type="range"
                min="1"
                max="60"
                [(ngModel)]="timeMinutes"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1D1C1C]"
              />
            </div>

            <div>
              <label class="ui-label block mb-2 font-display"
                >Incrément: {{ incrementSeconds() }} sec</label
              >
              <input
                type="range"
                min="0"
                max="60"
                [(ngModel)]="incrementSeconds"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1D1C1C]"
              />
            </div>

            <div class="flex justify-center space-x-4">
              <button
                (click)="selectedColor.set('w')"
                class="w-12 h-12 rounded-full border-2 border-[#1D1C1C] flex items-center justify-center hover:bg-gray-100"
                [class.ring-4]="selectedColor() === 'w'"
                [class.ring-[#7AF7F7]]="selectedColor() === 'w'"
              >
                <div class="w-6 h-6 bg-white border border-gray-300 rounded-full"></div>
              </button>
              <button
                (click)="selectedColor.set('random')"
                class="w-12 h-12 rounded-full border-2 border-[#1D1C1C] flex items-center justify-center bg-gradient-to-r from-white to-[#1D1C1C] hover:opacity-80"
                [class.ring-4]="selectedColor() === 'random'"
                [class.ring-[#7AF7F7]]="selectedColor() === 'random'"
              >
                <span class="mix-blend-difference text-white font-bold font-display">?</span>
              </button>
              <button
                (click)="selectedColor.set('b')"
                class="w-12 h-12 rounded-full border-2 border-[#1D1C1C] bg-[#1D1C1C] flex items-center justify-center hover:bg-gray-800"
                [class.ring-4]="selectedColor() === 'b'"
                [class.ring-[#7AF7F7]]="selectedColor() === 'b'"
              >
                <div class="w-6 h-6 bg-[#1D1C1C] border border-gray-600 rounded-full"></div>
              </button>
            </div>
          </div>

          <button
            (click)="startGame()"
            class="ui-btn ui-btn-dark w-full py-4 text-xl font-black font-display"
          >
            Lancer la partie
          </button>
        </div>

        <!-- Join/Info Panel -->
        <div
          class="ui-card p-8 flex flex-col items-center justify-center text-center opacity-90 hover:opacity-100 transition-opacity border-dashed"
        >
          <h3
            class="text-xl font-bold font-display text-[#1D1C1C] dark:text-gray-300 uppercase mb-4"
          >
            Lien d'invitation
          </h3>
          <div class="ui-card p-4 w-full mb-4 flex items-center justify-between">
            <code class="text-sm font-mono text-gray-500 truncate"
              >https://chessmaster.app/play/{{ generateCode() }}</code
            >
            <button class="ui-btn ui-btn-dark ml-2 text-xs px-2 py-1">Copier</button>
          </div>
          <p class="text-sm text-gray-500 max-w-xs">
            Partagez ce lien (simulation). Pour l'instant, le mode "Pass & Play" est activé sur cet
            appareil.
          </p>
        </div>
      </div>
    </div>
  `
})
export class FriendLobbyComponent {
  start = output<{ time: number; inc: number; color: 'w' | 'b' | 'random' }>();

  timeMinutes = signal(10);
  incrementSeconds = signal(0);
  selectedColor = signal<'w' | 'b' | 'random'>('random');

  generateCode() {
    return Math.random().toString(36).substring(7);
  }

  startGame() {
    this.start.emit({
      time: this.timeMinutes(),
      inc: this.incrementSeconds(),
      color: this.selectedColor()
    });
  }
}
