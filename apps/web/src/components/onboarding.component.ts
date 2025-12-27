
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { PreferencesService, BOARD_THEMES } from '../services/preferences.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-nano-banana p-4 font-sans">
      <div class="w-full max-w-2xl bg-white border-2 border-[#1D1C1C] wero-shadow relative flex flex-col md:flex-row overflow-hidden">
         
         <!-- Left: Preview -->
         <div class="w-full md:w-1/2 bg-[#FFF48D] p-8 flex flex-col items-center justify-center border-b-2 md:border-b-0 md:border-r-2 border-[#1D1C1C]">
            <h2 class="text-3xl font-black font-display text-[#1D1C1C] uppercase mb-6 text-center">Votre Style</h2>
            
            <div class="w-32 h-32 rounded-full border-4 border-[#1D1C1C] bg-white overflow-hidden mb-6 wero-shadow-sm">
                <img [src]="currentAvatarUrl" class="w-full h-full object-cover">
            </div>
            
            <h3 class="text-xl font-bold font-display text-[#1D1C1C] uppercase">{{ name() }}</h3>
            <p class="text-sm font-medium text-[#1D1C1C]/70">Grandmaster in making</p>
         </div>

         <!-- Right: Form -->
         <div class="w-full md:w-1/2 p-8 bg-white">
            <div class="space-y-6">
                
                <!-- Pseudo -->
                <div>
                    <label class="block text-xs font-bold font-display text-gray-500 uppercase mb-2">Pseudo</label>
                    <input type="text" [(ngModel)]="name" class="w-full px-3 py-2 border-2 border-[#1D1C1C] font-bold focus:bg-[#7AF7F7] outline-none">
                </div>

                <!-- Avatar Seed -->
                <div>
                    <label class="block text-xs font-bold font-display text-gray-500 uppercase mb-2">Avatar Seed</label>
                    <div class="flex space-x-2">
                        <input type="text" [(ngModel)]="avatarSeed" class="flex-1 px-3 py-2 border-2 border-[#1D1C1C] font-mono text-sm outline-none">
                        <button (click)="randomizeAvatar()" class="px-3 border-2 border-[#1D1C1C] bg-gray-100 hover:bg-[#FFF48D] font-bold">🎲</button>
                    </div>
                </div>

                <!-- Theme -->
                <div>
                    <label class="block text-xs font-bold font-display text-gray-500 uppercase mb-2">Thème Échiquier</label>
                    <div class="grid grid-cols-3 gap-2">
                        @for (theme of themes; track theme.id) {
                            <div (click)="selectTheme(theme.id)" 
                                 class="cursor-pointer border-2 aspect-square flex items-center justify-center hover:opacity-80 transition-all"
                                 [class.border-[#1D1C1C]]="prefs.activeThemeId() === theme.id"
                                 [class.border-transparent]="prefs.activeThemeId() !== theme.id"
                                 [class.ring-2]="prefs.activeThemeId() === theme.id"
                                 [class.ring-[#1D1C1C]]="prefs.activeThemeId() === theme.id">
                                 <div class="w-full h-full flex">
                                     <div class="w-1/2 h-full" [style.background]="theme.light"></div>
                                     <div class="w-1/2 h-full" [style.background]="theme.dark"></div>
                                 </div>
                            </div>
                        }
                    </div>
                </div>

                <button (click)="finish()" [disabled]="auth.isLoading()" 
                    class="w-full py-4 bg-[#7AF7F7] text-[#1D1C1C] text-lg font-black font-display uppercase border-2 border-[#1D1C1C] wero-shadow-sm hover:bg-[#FFF48D] transition-all disabled:opacity-50 mt-4">
                    {{ auth.isLoading() ? 'Finalisation...' : 'C\'est parti !' }}
                </button>

            </div>
         </div>

      </div>
    </div>
  `
})
export class OnboardingComponent {
  auth = inject(AuthService);
  prefs = inject(PreferencesService);
  
  name = signal('');
  avatarSeed = signal('');
  themes = BOARD_THEMES.slice(0, 3); // Show top 3 themes

  constructor() {
      const user = this.auth.currentUser();
      if (user) {
          this.name.set(user.name);
          this.avatarSeed.set(user.name); // Default seed
      }
  }

  get currentAvatarUrl() {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${this.avatarSeed()}`;
  }

  randomizeAvatar() {
      this.avatarSeed.set(Math.random().toString(36).substring(7));
  }

  selectTheme(id: string) {
      this.prefs.activeThemeId.set(id);
  }

  async finish() {
      await this.auth.completeOnboarding({
          name: this.name(),
          avatar: this.currentAvatarUrl
      });
  }
}
