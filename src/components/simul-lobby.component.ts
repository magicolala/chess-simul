
import { Component, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulService } from '../services/simul.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-simul-lobby',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (simulService.currentSimul(); as simul) {
        <div class="max-w-6xl mx-auto p-4 md:p-8 font-sans">
            
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-2 border-[#1D1C1C] dark:border-white pb-6">
                <div class="flex items-center space-x-6">
                    <img [src]="simul.host.avatar" class="w-24 h-24 rounded-full border-4 border-[#1D1C1C] dark:border-white bg-white">
                    <div>
                        <div class="flex items-center space-x-3">
                            <span class="bg-[#1D1C1C] text-white px-2 py-1 text-[10px] font-black uppercase">HOST</span>
                            <h2 class="text-4xl font-black font-display uppercase text-[#1D1C1C] dark:text-white">{{ simul.host.name }}</h2>
                        </div>
                        <p class="text-gray-500 font-bold mt-1">Simultanée • {{ simul.config.timeMinutes }}+{{ simul.config.incrementSeconds }} • {{ simul.maxPlayers }} Joueurs Max</p>
                    </div>
                </div>

                @if (isHost()) {
                    <div class="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                        <p class="text-xs font-bold text-gray-500 uppercase">{{ simul.challengers.length }} inscrits</p>
                        <button (click)="start.emit()" 
                            [disabled]="simul.challengers.length < 1"
                            class="px-8 py-4 bg-[#7AF7F7] text-[#1D1C1C] text-xl font-black font-display uppercase border-2 border-[#1D1C1C] wero-shadow hover:bg-[#FFF48D] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            Lancer l'événement
                        </button>
                    </div>
                } @else {
                     <div class="mt-4 md:mt-0 flex flex-col items-end space-y-2">
                         <div class="bg-green-100 text-green-800 border border-green-500 px-4 py-2 font-bold text-sm rounded-[2px] animate-pulse">
                             En attente de l'hôte...
                         </div>
                         <button (click)="leave.emit()" class="text-red-500 font-bold text-xs uppercase hover:underline">Quitter</button>
                     </div>
                }
            </div>

            <!-- Main Content -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Challengers Grid -->
                <div class="lg:col-span-2">
                    <h3 class="text-xl font-black font-display uppercase mb-4 text-[#1D1C1C] dark:text-white">Challengers ({{ simul.challengers.length }})</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        @for (player of simul.challengers; track player.id) {
                            <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white p-4 flex items-center space-x-3 wero-shadow-sm">
                                <img [src]="player.avatar" class="w-10 h-10 rounded-full border border-gray-300">
                                <div class="overflow-hidden">
                                    <p class="font-bold text-sm truncate text-[#1D1C1C] dark:text-white">{{ player.name }}</p>
                                    <p class="text-[10px] font-mono text-gray-500">{{ player.elo }}</p>
                                </div>
                                <div class="ml-auto w-3 h-3 rounded-full bg-green-500 border border-white" title="Prêt"></div>
                            </div>
                        }
                        <!-- Empty Slots -->
                        @for (i of emptySlots(); track i) {
                            <div class="border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 flex items-center justify-center text-gray-400 font-bold uppercase text-xs">
                                Libre
                            </div>
                        }
                    </div>
                </div>

                <!-- Chat / Log -->
                <div class="bg-white dark:bg-[#1a1a1a] border-2 border-[#1D1C1C] dark:border-white wero-shadow flex flex-col h-[500px]">
                    <div class="p-3 border-b-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#121212]">
                        <h3 class="font-black uppercase text-xs text-gray-500">Discussion de l'événement</h3>
                    </div>
                    <div class="flex-1 p-4 overflow-y-auto space-y-3">
                        <div class="text-center text-[10px] font-bold text-gray-400 uppercase">Le lobby est ouvert</div>
                        @for (player of simul.challengers; track player.id) {
                            <div class="text-xs text-gray-600 dark:text-gray-400">
                                <span class="font-bold text-[#1D1C1C] dark:text-white">{{ player.name }}</span> a rejoint la simultanée.
                            </div>
                        }
                    </div>
                    <div class="p-3 border-t-2 border-[#1D1C1C] dark:border-white">
                        <input type="text" placeholder="Envoyer un message..." class="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-[#121212] dark:text-white text-sm outline-none focus:border-[#1D1C1C] dark:focus:border-white">
                    </div>
                </div>

            </div>
        </div>
    }
  `
})
export class SimulLobbyComponent {
  simulService = inject(SimulService);
  auth = inject(AuthService);
  
  start = output<void>();
  leave = output<void>();

  isHost = computed(() => {
    const simul = this.simulService.currentSimul();
    const user = this.auth.currentUser();
    return simul && user && simul.host.name === user.name;
  });

  emptySlots = computed(() => {
    const simul = this.simulService.currentSimul();
    if (!simul) return [];
    const remaining = simul.maxPlayers - simul.challengers.length;
    return Array(Math.max(0, remaining)).fill(0);
  });
}
