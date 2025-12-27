
import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiplayerService, MultiplayerRoom } from '../services/multiplayer.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-multiplayer-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto p-4 md:p-8 font-sans h-full flex flex-col">
        
        <!-- Header -->
        <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between">
            <div>
                <h2 class="text-4xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter">Multijoueur</h2>
                <p class="text-gray-500 font-bold">Affrontez des joueurs du monde entier.</p>
            </div>
            <!-- Tabs -->
            <div class="flex space-x-2 mt-4 md:mt-0 bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-[2px] border-2 border-[#1D1C1C] dark:border-gray-700">
                <button (click)="activeTab.set('quick')" [class.bg-[#1D1C1C]]="activeTab() === 'quick'" [class.text-white]="activeTab() === 'quick'" class="px-4 py-2 text-sm font-bold uppercase transition-colors">Rapide</button>
                <button (click)="activeTab.set('lobby')" [class.bg-[#1D1C1C]]="activeTab() === 'lobby'" [class.text-white]="activeTab() === 'lobby'" class="px-4 py-2 text-sm font-bold uppercase transition-colors">Salons</button>
                <button (click)="activeTab.set('create')" [class.bg-[#1D1C1C]]="activeTab() === 'create'" [class.text-white]="activeTab() === 'create'" class="px-4 py-2 text-sm font-bold uppercase transition-colors">Créer</button>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto">
            
            <!-- QUICK MATCH -->
            @if (activeTab() === 'quick') {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center">
                    <div class="space-y-4">
                         <div class="p-6 bg-[#FFF48D] border-2 border-[#1D1C1C] wero-shadow relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform" (click)="startMatchmaking('blitz')">
                             <h3 class="text-2xl font-black font-display uppercase mb-1">Blitz 3+2</h3>
                             <p class="text-sm font-bold opacity-80">Populaire • Rapide • Intense</p>
                             <div class="absolute right-4 bottom-4 text-6xl opacity-20">⚡</div>
                         </div>
                         <div class="p-6 bg-[#7AF7F7] border-2 border-[#1D1C1C] wero-shadow relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform" (click)="startMatchmaking('rapid')">
                             <h3 class="text-2xl font-black font-display uppercase mb-1">Rapide 10+0</h3>
                             <p class="text-sm font-bold opacity-80">Stratégique • Réfléchi</p>
                             <div class="absolute right-4 bottom-4 text-6xl opacity-20">🐢</div>
                         </div>
                    </div>
                    
                    <div class="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 rounded-[2px] h-full min-h-[300px]">
                        @if (mpService.isMatchmaking()) {
                            <div class="animate-spin text-4xl mb-4">⏳</div>
                            <p class="text-xl font-black font-display uppercase">Recherche...</p>
                            <p class="text-gray-500 font-mono text-sm mt-2">ELO: 1200 ± 50</p>
                        } @else {
                            <p class="text-gray-400 font-bold text-center">Sélectionnez un mode pour lancer la recherche.</p>
                        }
                    </div>
                </div>
            }

            <!-- LOBBY LIST -->
            @if (activeTab() === 'lobby') {
                <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow">
                    <div class="grid grid-cols-4 gap-4 p-4 border-b-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#121212] font-black font-display uppercase text-xs text-gray-500">
                        <div class="col-span-1">Hôte</div>
                        <div class="col-span-1 text-center">Cadence</div>
                        <div class="col-span-1 text-center">Mode</div>
                        <div class="col-span-1 text-right">Action</div>
                    </div>
                    <div class="divide-y-2 divide-[#1D1C1C] dark:divide-white/20">
                        @for (room of mpService.rooms(); track room.id) {
                            <div class="grid grid-cols-4 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div class="col-span-1 flex items-center space-x-3">
                                    <img [src]="room.hostAvatar" class="w-8 h-8 rounded-full border border-[#1D1C1C] dark:border-white">
                                    <div>
                                        <p class="font-bold text-sm text-[#1D1C1C] dark:text-white">{{ room.hostName }}</p>
                                        <p class="text-[10px] font-mono text-gray-500">{{ room.hostElo }}</p>
                                    </div>
                                </div>
                                <div class="col-span-1 text-center font-mono font-bold text-sm">
                                    {{ room.config.timeMinutes }}+{{ room.config.incrementSeconds }}
                                </div>
                                <div class="col-span-1 text-center">
                                    <span class="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-[10px] font-bold uppercase rounded">Classé</span>
                                </div>
                                <div class="col-span-1 text-right">
                                    <button (click)="joinRoom(room.id)" class="px-4 py-1 bg-[#1D1C1C] dark:bg-white text-white dark:text-[#1D1C1C] text-xs font-black uppercase hover:bg-[#7AF7F7] hover:text-[#1D1C1C] transition-colors border border-transparent hover:border-[#1D1C1C]">
                                        Rejoindre
                                    </button>
                                </div>
                            </div>
                        }
                        @if (mpService.rooms().length === 0) {
                            <div class="p-8 text-center text-gray-400 font-bold italic">Aucun salon public disponible.</div>
                        }
                    </div>
                </div>
            }

            <!-- CREATE ROOM -->
            @if (activeTab() === 'create') {
                <div class="max-w-2xl mx-auto bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow p-8">
                    <h3 class="text-2xl font-black font-display uppercase mb-6 text-[#1D1C1C] dark:text-white">Paramètres du salon</h3>
                    
                    <div class="space-y-6">
                         <div>
                            <label class="block text-xs font-bold font-display text-gray-500 uppercase mb-2">Cadence</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <span class="text-xs font-bold mb-1 block">Temps (min)</span>
                                    <input type="number" [(ngModel)]="createConfig.timeMinutes" class="w-full p-2 border-2 border-[#1D1C1C] font-mono font-bold">
                                </div>
                                <div>
                                    <span class="text-xs font-bold mb-1 block">Incrément (sec)</span>
                                    <input type="number" [(ngModel)]="createConfig.incrementSeconds" class="w-full p-2 border-2 border-[#1D1C1C] font-mono font-bold">
                                </div>
                            </div>
                         </div>

                         <div>
                            <label class="block text-xs font-bold font-display text-gray-500 uppercase mb-2">Visibilité</label>
                            <div class="flex space-x-4">
                                <button (click)="isPrivate.set(false)" [class.bg-[#1D1C1C]]="!isPrivate()" [class.text-white]="!isPrivate()" class="flex-1 py-3 border-2 border-[#1D1C1C] font-bold uppercase text-xs">Public</button>
                                <button (click)="isPrivate.set(true)" [class.bg-[#1D1C1C]]="isPrivate()" [class.text-white]="isPrivate()" class="flex-1 py-3 border-2 border-[#1D1C1C] font-bold uppercase text-xs">Privé (Lien)</button>
                            </div>
                         </div>

                         <button (click)="createRoom()" class="w-full py-4 bg-[#FFF48D] text-[#1D1C1C] font-black font-display uppercase text-xl border-2 border-[#1D1C1C] hover:bg-[#7AF7F7] wero-shadow-sm transition-all mt-4">
                             Créer le salon
                         </button>
                    </div>
                </div>
            }

        </div>
    </div>
  `
})
export class MultiplayerLobbyComponent {
  mpService = inject(MultiplayerService);
  auth = inject(AuthService);
  
  // Output events to handle navigation in Parent
  joined = output<void>();

  activeTab = signal<'quick' | 'lobby' | 'create'>('quick');
  
  // Create Config
  createConfig = { timeMinutes: 10, incrementSeconds: 0, opponentCount: 1, difficulty: 'pvp' as const };
  isPrivate = signal(false);

  async startMatchmaking(mode: string) {
      await this.mpService.startMatchmaking({ mode });
      this.joined.emit();
  }

  createRoom() {
     const user = this.auth.currentUser();
     if (!user) return;

     this.mpService.createRoom(
         this.createConfig, 
         this.isPrivate(),
         user.name,
         user.avatar,
         1200 // Mock user elo
     );
     this.joined.emit();
  }

  joinRoom(id: string) {
     const user = this.auth.currentUser();
     if (!user) return;

     this.mpService.joinRoom(id, user.name, user.avatar);
     this.joined.emit();
  }
}
