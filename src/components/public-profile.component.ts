
import { Component, inject, input, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SocialService } from '../services/social.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    @if (social.viewedProfile(); as profile) {
        <div class="max-w-6xl mx-auto p-4 md:p-8 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <!-- Header Card -->
            <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow p-8 mb-8 relative overflow-hidden">
                <!-- Background Decoration -->
                <div class="absolute top-0 right-0 p-8 opacity-5 text-9xl font-display pointer-events-none">♟</div>

                <div class="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                    <div class="relative group">
                        <img [src]="profile.avatar" class="w-32 h-32 rounded-full border-4 border-[#1D1C1C] dark:border-white bg-gray-100 object-cover">
                        @if (isMe(profile.id)) {
                             <div class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                 <span class="text-white font-bold text-xs uppercase">Modifier</span>
                             </div>
                        }
                    </div>

                    <div class="flex-1 text-center md:text-left">
                        <h2 class="text-4xl font-black font-display uppercase text-[#1D1C1C] dark:text-white mb-2">{{ profile.name }}</h2>
                        <p class="text-gray-600 dark:text-gray-300 font-medium mb-4 max-w-lg">{{ profile.bio }}</p>
                        
                        <div class="flex flex-wrap justify-center md:justify-start gap-3">
                            <span class="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-xs font-bold uppercase border border-gray-300 dark:border-gray-600 rounded-[2px] text-gray-600 dark:text-gray-300">
                                Membre depuis {{ profile.joinedAt | date:'mediumDate' }}
                            </span>
                            @if (!isMe(profile.id)) {
                                <button class="px-4 py-1 bg-[#1D1C1C] text-white text-xs font-black uppercase hover:bg-[#7AF7F7] hover:text-[#1D1C1C] transition-colors border border-transparent hover:border-[#1D1C1C]">
                                    Ajouter en ami
                                </button>
                                <button class="px-4 py-1 bg-white border border-[#1D1C1C] text-[#1D1C1C] text-xs font-black uppercase hover:bg-gray-100">
                                    Message
                                </button>
                            }
                        </div>
                    </div>

                    <!-- Highlight Stat -->
                    <div class="bg-[#FFF48D] p-4 border-2 border-[#1D1C1C] text-center w-full md:w-auto">
                        <p class="text-xs font-black uppercase text-[#1D1C1C]/70 mb-1">Meilleur ELO</p>
                        <p class="text-4xl font-black font-display text-[#1D1C1C]">{{ getMaxElo(profile) }}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Left Column: Stats -->
                <div class="lg:col-span-2 space-y-8">
                    
                    <!-- ELO Cards -->
                    <div>
                        <h3 class="text-xl font-black font-display uppercase mb-4 text-[#1D1C1C] dark:text-white border-b-2 border-[#1D1C1C] dark:border-white pb-2 inline-block">Classement</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-white dark:bg-[#1a1a1a] p-4 border-2 border-[#1D1C1C] dark:border-white wero-shadow-sm hover:translate-y-[-2px] transition-transform">
                                <div class="text-red-500 mb-2 text-2xl">🔥</div>
                                <p class="text-xs font-bold text-gray-500 uppercase">Bullet</p>
                                <p class="text-2xl font-black font-mono text-[#1D1C1C] dark:text-white">{{ profile.stats.bullet }}</p>
                            </div>
                            <div class="bg-white dark:bg-[#1a1a1a] p-4 border-2 border-[#1D1C1C] dark:border-white wero-shadow-sm hover:translate-y-[-2px] transition-transform">
                                <div class="text-[#FFF48D] drop-shadow-md mb-2 text-2xl">⚡</div>
                                <p class="text-xs font-bold text-gray-500 uppercase">Blitz</p>
                                <p class="text-2xl font-black font-mono text-[#1D1C1C] dark:text-white">{{ profile.stats.blitz }}</p>
                            </div>
                            <div class="bg-white dark:bg-[#1a1a1a] p-4 border-2 border-[#1D1C1C] dark:border-white wero-shadow-sm hover:translate-y-[-2px] transition-transform">
                                <div class="text-green-500 mb-2 text-2xl">🐢</div>
                                <p class="text-xs font-bold text-gray-500 uppercase">Rapide</p>
                                <p class="text-2xl font-black font-mono text-[#1D1C1C] dark:text-white">{{ profile.stats.rapid }}</p>
                            </div>
                            <div class="bg-white dark:bg-[#1a1a1a] p-4 border-2 border-[#1D1C1C] dark:border-white wero-shadow-sm hover:translate-y-[-2px] transition-transform">
                                <div class="text-blue-500 mb-2 text-2xl">☕</div>
                                <p class="text-xs font-bold text-gray-500 uppercase">Classique</p>
                                <p class="text-2xl font-black font-mono text-[#1D1C1C] dark:text-white">{{ profile.stats.classical }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Badges -->
                    <div>
                         <h3 class="text-xl font-black font-display uppercase mb-4 text-[#1D1C1C] dark:text-white border-b-2 border-[#1D1C1C] dark:border-white pb-2 inline-block">Badges & Trophées</h3>
                         <div class="flex flex-wrap gap-4">
                             @for (badge of profile.badges; track badge.id) {
                                 <div class="bg-gray-50 dark:bg-[#121212] border-2 border-gray-200 dark:border-gray-700 p-3 flex items-center space-x-3 pr-6 rounded-[2px] group relative cursor-help">
                                     <div class="text-3xl">{{ badge.icon }}</div>
                                     <div>
                                         <p class="font-bold text-sm text-[#1D1C1C] dark:text-white leading-none">{{ badge.name }}</p>
                                         <p class="text-[10px] text-gray-500 mt-1">{{ badge.unlockedAt | date:'shortDate' }}</p>
                                     </div>
                                     
                                     <!-- Tooltip -->
                                     <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1D1C1C] text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 text-center">
                                         {{ badge.description }}
                                         <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1D1C1C]"></div>
                                     </div>
                                 </div>
                             }
                         </div>
                    </div>

                </div>

                <!-- Right Column: Mock Activity -->
                <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow p-6 h-fit">
                    <h3 class="text-sm font-black uppercase text-gray-500 mb-4">Activité Récente</h3>
                    <div class="space-y-4">
                        <div class="flex items-center space-x-3 border-b border-gray-100 pb-3">
                            <span class="w-2 h-2 rounded-full bg-green-500"></span>
                            <p class="text-xs">A gagné contre <span class="font-bold">MagnusCarlsenClone</span> en Blitz.</p>
                        </div>
                        <div class="flex items-center space-x-3 border-b border-gray-100 pb-3">
                            <span class="w-2 h-2 rounded-full bg-red-500"></span>
                            <p class="text-xs">A perdu contre <span class="font-bold">Stockfish_Lvl1</span>.</p>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                            <p class="text-xs">A rejoint le tournoi <span class="font-bold italic">Sunday Bullet Arena</span>.</p>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    }
  `
})
export class PublicProfileComponent {
  social = inject(SocialService);
  auth = inject(AuthService);
  
  // Input: Profile ID to load (from route param usually)
  userId = input<string>('');

  constructor() {
      effect(() => {
          if (this.userId()) {
              this.social.loadProfile(this.userId());
          }
      });
  }

  isMe(id: string): boolean {
      return this.auth.currentUser()?.id === id;
  }

  getMaxElo(p: any): number {
      return Math.max(p.stats.bullet, p.stats.blitz, p.stats.rapid, p.stats.classical);
  }
}
