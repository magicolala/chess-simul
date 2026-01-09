import { Component, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseSimulService } from '../services/supabase-simul.service';
import { SupabaseClientService } from '../services/supabase-client.service';
import { SimulWithTables } from '../models/simul.model';

@Component({
  selector: 'app-simul-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto p-4 md:p-8 font-sans h-full flex flex-col">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-end">
        <div>
          <h2
            class="text-4xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter"
          >
            Simultanées
          </h2>
          <p class="text-gray-500 font-bold">Défiez des maîtres ou créez votre propre événement.</p>
        </div>
        <button
          (click)="create.emit()"
          class="ui-btn ui-btn-primary px-6 py-3 font-black font-display"
        >
          + Créer
        </button>
      </div>

      <!-- Filters -->
      <div class="flex space-x-2 mb-6 overflow-x-auto pb-2">
        <button
          (click)="filter.set('all')"
          [class.bg-[#1D1C1C]]="filter() === 'all'"
          [class.text-white]="filter() === 'all'"
          class="ui-btn ui-btn-ghost px-4 py-1 text-xs"
        >
          Tout
        </button>
        <button
          (click)="filter.set('open')"
          [class.bg-[#1D1C1C]]="filter() === 'open'"
          [class.text-white]="filter() === 'open'"
          class="ui-btn ui-btn-ghost px-4 py-1 text-xs"
        >
          Ouvertes
        </button>
        <button
          (click)="filter.set('started')"
          [class.bg-[#1D1C1C]]="filter() === 'started'"
          [class.text-white]="filter() === 'started'"
          class="ui-btn ui-btn-ghost px-4 py-1 text-xs"
        >
          En cours
        </button>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (simul of filteredSimuls(); track simul.id) {
          <div class="ui-card group relative overflow-hidden flex flex-col">
            <!-- Status Badge -->
            <div
              class="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase z-10 border-l-2 border-b-2 border-[#1D1C1C] dark:border-white"
              [class.bg-green-400]="simul.status === 'open'"
              [class.bg-yellow-400]="simul.status === 'running'"
              [class.bg-gray-300]="simul.status === 'finished'"
            >
              {{ getStatusLabel(simul) }}
            </div>

            <!-- Host Info -->
            <div class="ui-card-header p-6 pb-4 flex items-center space-x-4">
              <div class="w-14 h-14 rounded-full border-2 border-[#1D1C1C] dark:border-white bg-gray-200 flex items-center justify-center">
                <span class="text-2xl">👤</span>
              </div>
              <div>
                <h3 class="font-black font-display text-lg uppercase leading-none text-[#1D1C1C] dark:text-white">
                  {{ simul.name || 'Partie Simultanée' }}
                </h3>
                <p class="text-xs font-mono font-bold text-gray-500">Hôte: {{ getHostIdShort(simul) }}</p>
              </div>
            </div>

            <!-- Details -->
            <div class="p-6 flex-1 space-y-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                  <span class="text-xl">⏱</span>
                  <span class="font-mono font-bold text-[#1D1C1C] dark:text-white">
                    {{ getTimeControl(simul) }}
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xl">👥</span>
                  <span class="font-mono font-bold text-[#1D1C1C] dark:text-white">
                    {{ getChallengersCount(simul) }} / {{ getTotalSeats(simul) }}
                  </span>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full h-3 bg-gray-200 border-2 border-[#1D1C1C] rounded-full overflow-hidden">
                <div
                  class="h-full bg-[#1D1C1C] dark:bg-white"
                  [style.width.%]="getProgressPercent(simul)"
                ></div>
              </div>

              <button
                (click)="join.emit(simul.id)"
                [disabled]="simul.status !== 'open' || isOwnSimul(simul)"
                class="ui-btn ui-btn-secondary w-full py-3 mt-2 font-black"
              >
                {{ isOwnSimul(simul) ? 'Votre simul' : (simul.status === 'open' ? 'Rejoindre' : 'Regarder') }}
              </button>
            </div>
          </div>
        }
        @if (filteredSimuls().length === 0) {
          <div class="col-span-full p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 font-bold italic">
            Aucune simultanée trouvée avec ce filtre.
          </div>
        }
      </div>
    </div>
  `
})
export class SimulListComponent {
  simulService = inject(SupabaseSimulService);
  private supabaseClient = inject(SupabaseClientService);
  create = output<void>();
  join = output<string>();

  filter = signal<'all' | 'open' | 'started'>('all');

  constructor() {
    console.log('[SimulListComponent] 🛠️ Initializing with SupabaseSimulService (REAL DATA)');
    this.simulService.fetchSimuls();
  }

  filteredSimuls = computed(() => {
    const all = this.simulService.simulList();
    const f = this.filter();
    console.log('[SimulListComponent] 📊 Filtering simuls:', { total: all.length, filter: f });
    if (f === 'all') return all;
    const statusFilter = f === 'started' ? 'running' : f;
    return all.filter((s) => s.status === statusFilter);
  });

  // Helper methods for template
  getStatusLabel(simul: SimulWithTables): string {
    if (simul.status === 'open') return 'Inscription';
    if (simul.status === 'running') return 'En cours';
    return 'Terminée';
  }

  getHostIdShort(simul: SimulWithTables): string {
    return simul.host_id?.slice(0, 8) || 'N/A';
  }

  getTimeControl(simul: SimulWithTables): string {
    const initial = simul.time_control?.initial || 600;
    const increment = simul.time_control?.increment || 0;
    return `${Math.floor(initial / 60)}+${increment}`;
  }

  getChallengersCount(simul: SimulWithTables): number {
    return simul.simul_tables?.filter(t => t.challenger_id !== null).length || 0;
  }

  getTotalSeats(simul: SimulWithTables): number {
    return simul.simul_tables?.length || 0;
  }

  getProgressPercent(simul: SimulWithTables): number {
    const filled = this.getChallengersCount(simul);
    const total = this.getTotalSeats(simul);
    if (total === 0) return 0;
    return (filled / total) * 100;
  }

  isOwnSimul(simul: SimulWithTables): boolean {
    const currentUserId = this.supabaseClient.currentUser()?.id;
    return !!currentUserId && simul.host_id === currentUserId;
  }
}
