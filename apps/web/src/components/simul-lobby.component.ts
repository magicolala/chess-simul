import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { SupabaseSimulService } from '../services/supabase-simul.service';
import { SupabaseClientService } from '../services/supabase-client.service';
import { SimulTableStatus } from '../models/simul.model';

@Component({
  selector: 'app-simul-lobby',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 space-y-4 border rounded-md bg-white dark:bg-black" *ngIf="simulService.activeSimul(); else loading">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase font-semibold text-gray-500">Simultanée</p>
          <h2 class="text-2xl font-black">{{ simulService.activeSimul()?.name }}</h2>
          <p class="text-sm text-gray-500">Status : {{ simulService.simulStatus() }}</p>
          <p class="text-sm text-gray-500" *ngIf="isHost">Vous êtes l'hôte ({{ currentUserId }})</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold">Places</p>
          <p class="text-lg font-mono">{{ reservedCount }}/{{ simulService.activeSimul()?.simul_tables.length }}</p>
        </div>
      </div>

      <div class="p-3 rounded border bg-gray-50 dark:bg-gray-900" *ngIf="simulService.error()" role="alert">
        {{ simulService.error() }}
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div
          class="border rounded p-3 flex items-center justify-between"
          *ngFor="let table of simulService.activeSimul()?.simul_tables"
        >
          <div>
            <p class="text-xs font-semibold text-gray-500">Table #{{ table.seat_no }}</p>
            <p class="font-bold">{{ formatStatus(table.status) }}</p>
            <p class="text-xs text-gray-500" *ngIf="table.guest_id">Guest : {{ table.guest_id }}</p>
            <p class="text-xs text-gray-500" *ngIf="table.game_id">Game : {{ table.game_id }}</p>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <span class="text-xs px-2 py-1 rounded-full border" [class.bg-green-100]="table.status === 'reserved'">
              {{ table.status }}
            </span>
            <button
              class="px-3 py-1 text-sm font-semibold border rounded"
              [disabled]="!isHost || table.status !== 'reserved'"
              (click)="startTable(table.id)"
            >
              Lancer la partie
            </button>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="p-4 border rounded-md">Chargement de la simultanée...</div>
    </ng-template>
  `,
})
export class SimulLobbyComponent implements OnChanges {
  private supabaseAuth = inject(SupabaseClientService);
  simulService = inject(SupabaseSimulService);

  @Input({ required: true }) simulId!: string;

  get currentUserId() {
    return this.supabaseAuth.currentUser?.id ?? 'inconnu';
  }

  get isHost() {
    return this.simulService.activeSimul()?.host_id === this.supabaseAuth.currentUser?.id;
  }

  get reservedCount() {
    const simul = this.simulService.activeSimul();
    if (!simul) return 0;
    return simul.simul_tables.filter((t) => t.status === 'reserved' || t.status === 'playing').length;
  }

  ngOnChanges(): void {
    if (this.simulId) {
      this.simulService.fetchSimul(this.simulId);
    }
  }

  formatStatus(status: SimulTableStatus) {
    const map: Record<SimulTableStatus, string> = {
      free: 'Disponible',
      reserved: 'Réservé',
      playing: 'En cours',
      done: 'Terminé',
    };
    return map[status];
  }

  async startTable(tableId: string) {
    try {
      await this.simulService.startTable(tableId);
    } catch (err) {
      this.simulService.error.set(this.simulService.friendlyError(err));
    }
  }
}
