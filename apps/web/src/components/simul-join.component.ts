import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { SupabaseSimulService } from '../services/supabase-simul.service';
import { SimulTable } from '../models/simul.model';

@Component({
  selector: 'app-simul-join',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 border rounded bg-white dark:bg-black" *ngIf="simulService.activeSimul(); else loader">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase font-semibold text-gray-500">Simultanée</p>
          <h2 class="text-2xl font-black">{{ simulService.activeSimul()?.name }}</h2>
          <p class="text-sm text-gray-500">Status : {{ simulService.simulStatus() }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold">Places libres</p>
          <p class="text-lg font-mono">{{ freeSeats }}</p>
        </div>
      </div>

      <div class="p-3 rounded border bg-gray-50 dark:bg-gray-900" *ngIf="simulService.error()" role="alert">
        {{ simulService.error() }}
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="px-4 py-2 border rounded font-semibold"
          [disabled]="simulService.loading() || simulService.simulStatus() !== 'open'"
          (click)="join()"
        >
          Rejoindre une table libre
        </button>
        <p class="text-sm text-gray-500" *ngIf="lastSeat">Réservé sur la table #{{ lastSeat.seat_no }}</p>
      </div>
    </div>

    <ng-template #loader>
      <div class="p-4 border rounded">Chargement du lobby invité...</div>
    </ng-template>
  `,
})
export class SimulJoinComponent implements OnChanges {
  simulService = inject(SupabaseSimulService);

  @Input({ required: true }) simulId!: string;
  lastSeat: SimulTable | null = null;

  get freeSeats() {
    const simul = this.simulService.activeSimul();
    if (!simul) return 0;
    return simul.simul_tables.filter((t) => t.status === 'free').length;
  }

  ngOnChanges(): void {
    if (this.simulId) {
      this.simulService.fetchSimul(this.simulId);
    }
  }

  async join() {
    try {
      const seat = await this.simulService.joinSimul(this.simulId);
      this.lastSeat = seat;
    } catch (err) {
      this.simulService.error.set(this.simulService.friendlyError(err));
    }
  }
}
