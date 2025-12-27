
import { Component, inject, signal, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { PreferencesService, BOARD_THEMES, PIECE_SETS } from '../services/preferences.service';
import { AuthService } from '../services/auth.service';
import { ChessBoardComponent } from './chess-board.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, ReactiveFormsModule],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-[#1D1C1C] dark:text-white font-['Inter'] transition-colors duration-300">
        
        <!-- Modal Header -->
        <div class="flex-shrink-0 p-6 border-b-2 border-[#1D1C1C] dark:border-white flex items-center justify-between bg-white dark:bg-[#1a1a1a] z-10">
            <h2 class="text-3xl font-black flex items-center uppercase tracking-tighter">
                <span class="mr-3 bg-[#FFF48D] w-10 h-10 flex items-center justify-center border-2 border-[#1D1C1C] text-[#1D1C1C] text-xl">⚙️</span> 
                Configuration
            </h2>
            <button (click)="close.emit()" class="w-10 h-10 flex items-center justify-center border-2 border-transparent hover:border-[#1D1C1C] dark:hover:border-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-[2px] text-2xl font-bold leading-none">
                ×
            </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
            
            <!-- General Settings -->
            <section>
                 <h3 class="text-lg font-bold text-[#1D1C1C] dark:text-white mb-6 bg-[#7AF7F7] inline-block px-2 border-2 border-transparent text-black uppercase tracking-wide">Général</h3>
                 
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <!-- Avatar -->
                     <div class="flex items-start space-x-4">
                         <img [src]="auth.currentUser()?.avatar" class="w-16 h-16 border-2 border-[#1D1C1C] dark:border-white bg-white shrink-0">
                         <div class="flex-1">
                             <label class="block text-sm font-bold text-[#1D1C1C] dark:text-gray-300 mb-2">Modifier l'Avatar (Seed)</label>
                             <div class="flex">
                                 <input [formControl]="avatarControl" class="flex-1 px-3 py-2 border-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-gray-800 dark:text-white text-sm font-bold outline-none" placeholder="Tapez un mot...">
                                 <button (click)="updateAvatar()" class="px-3 py-2 bg-[#1D1C1C] dark:bg-white text-white dark:text-black font-black border-2 border-[#1D1C1C] dark:border-white uppercase text-xs">
                                     OK
                                 </button>
                             </div>
                         </div>
                     </div>

                     <!-- Dark Mode Toggle -->
                     <div class="flex items-center justify-between p-4 border-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-gray-800 h-20">
                         <div>
                             <h4 class="font-black text-[#1D1C1C] dark:text-white uppercase text-sm">Mode Sombre</h4>
                             <p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Appliqué après sauvegarde</p>
                         </div>
                         <button (click)="toggleTempDarkMode()" 
                             class="w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none border-2 border-[#1D1C1C] dark:border-white"
                             [class.bg-[#1D1C1C]]="tempDarkMode()"
                             [class.bg-gray-200]="!tempDarkMode()">
                             <div class="w-3 h-3 rounded-full bg-white transition-transform duration-300"
                                  [class.translate-x-6]="tempDarkMode()"></div>
                         </button>
                     </div>
                 </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Board Themes -->
                <section>
                    <h3 class="text-lg font-bold text-[#1D1C1C] dark:text-white mb-4 bg-[#7AF7F7] inline-block px-2 border-2 border-transparent text-black uppercase tracking-wide">Échiquier</h3>
                    <div class="grid grid-cols-2 gap-3">
                        @for (theme of themes; track theme.id) {
                        <div 
                            (click)="tempThemeId.set(theme.id)"
                            class="cursor-pointer group relative overflow-hidden border-2 transition-all hover:wero-shadow-sm"
                            [class.border-[#1D1C1C]]="true"
                            [class.dark:border-white]="true"
                            [class.ring-4]="tempThemeId() === theme.id"
                            [class.ring-[#FFF48D]]="tempThemeId() === theme.id"
                        >
                            <!-- Preview Mini Board -->
                            <div class="w-full aspect-square flex">
                                <div class="w-1/2 h-full" [style.backgroundColor]="theme.light"></div>
                                <div class="w-1/2 h-full" [style.backgroundColor]="theme.dark"></div>
                            </div>
                            
                            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#1D1C1C]/80">
                                <div class="bg-white px-2 py-1 border-2 border-black text-xs font-bold uppercase">
                                    {{ theme.name }}
                                </div>
                            </div>

                            @if (tempThemeId() === theme.id) {
                                <div class="absolute top-2 right-2 bg-[#1D1C1C] text-[#FFF48D] w-6 h-6 flex items-center justify-center border-2 border-white font-bold">✓</div>
                            }
                        </div>
                        }
                    </div>
                </section>

                <!-- Piece Sets -->
                <section>
                    <h3 class="text-lg font-bold text-[#1D1C1C] dark:text-white mb-4 bg-[#7AF7F7] inline-block px-2 border-2 border-transparent text-black uppercase tracking-wide">Pièces</h3>
                    <div class="space-y-2">
                        @for (set of pieceSets; track set.id) {
                        <div 
                            (click)="tempPieceSetId.set(set.id)"
                            class="flex items-center justify-between p-2 px-3 border-2 cursor-pointer transition-all hover:translate-x-1"
                            [class.border-[#1D1C1C]]="true"
                            [class.dark:border-white]="true"
                            [class.bg-[#1D1C1C]]="tempPieceSetId() === set.id"
                            [class.text-white]="tempPieceSetId() === set.id"
                            [class.bg-white]="tempPieceSetId() !== set.id"
                            [class.text-[#1D1C1C]]="tempPieceSetId() !== set.id"
                        >
                            <span class="font-bold text-xs uppercase tracking-wide">{{ set.name }}</span>
                            
                            <!-- Preview Pieces -->
                            <div class="flex space-x-1 bg-gray-100 p-1 border border-gray-300">
                                <img [src]="'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/' + set.id + '/wN.svg'" class="w-6 h-6">
                                <img [src]="'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/' + set.id + '/bP.svg'" class="w-6 h-6">
                            </div>
                        </div>
                        }
                    </div>
                </section>
            </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex-shrink-0 p-6 border-t-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#121212] flex justify-end space-x-4 z-10">
             <button (click)="close.emit()" class="px-6 py-3 bg-transparent border-2 border-[#1D1C1C] dark:border-white text-[#1D1C1C] dark:text-white font-black uppercase hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm">
                 Annuler
             </button>
             <button (click)="saveChanges()" 
                class="px-6 py-3 bg-[#1D1C1C] dark:bg-white text-[#FFF48D] dark:text-black border-2 border-[#1D1C1C] dark:border-white font-black uppercase hover:bg-gray-800 dark:hover:bg-gray-200 transition-all wero-shadow-sm flex items-center min-w-[240px] justify-center text-sm"
                [class.bg-green-500]="showSuccess()"
                [class.text-white]="showSuccess()"
                [class.border-green-600]="showSuccess()">
                 @if (showSuccess()) {
                     <span>✓ Sauvegardé !</span>
                 } @else {
                     <span>Sauvegarder</span>
                 }
             </button>
        </div>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
  `]
})
export class SettingsComponent implements OnInit {
  prefs = inject(PreferencesService);
  auth = inject(AuthService);
  themes = BOARD_THEMES;
  pieceSets = PIECE_SETS;

  avatarControl = new FormControl('');
  
  close = output<void>();

  // Temporary State
  tempThemeId = signal('wero');
  tempPieceSetId = signal('cburnett');
  tempDarkMode = signal(false);
  
  // UI State
  showSuccess = signal(false);

  ngOnInit() {
      this.resetToCurrent();
  }

  resetToCurrent() {
      this.tempThemeId.set(this.prefs.activeThemeId());
      this.tempPieceSetId.set(this.prefs.activePieceSetId());
      this.tempDarkMode.set(this.prefs.darkMode());
  }

  toggleTempDarkMode() {
      this.tempDarkMode.update(d => !d);
  }

  updateAvatar() {
    if (this.avatarControl.value) {
        this.auth.updateAvatar(this.avatarControl.value);
        this.avatarControl.reset();
    }
  }

  saveChanges() {
      this.prefs.activeThemeId.set(this.tempThemeId());
      this.prefs.activePieceSetId.set(this.tempPieceSetId());
      this.prefs.darkMode.set(this.tempDarkMode());
      
      this.showSuccess.set(true);
      setTimeout(() => {
          this.showSuccess.set(false);
          this.close.emit(); // Auto close on save for better flow
      }, 1000);
  }
}
