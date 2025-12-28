import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SimulTableStatus } from '../models/simul.model';
import { PresenceUser } from '../models/realtime.model';
import { RealtimeSimulService } from '../services/realtime-simul.service';
import { SupabaseClientService } from '../services/supabase-client.service';
import { SupabaseSimulService } from '../services/supabase-simul.service';

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

      <div class="grid gap-3 md:grid-cols-3">
        <div class="md:col-span-2 grid gap-3 md:grid-cols-2">
          <div
            class="border rounded p-3 flex items-center justify-between"
            *ngFor="let table of simulService.activeSimul()?.simul_tables"
          >
            <div>
              <p class="text-xs font-semibold text-gray-500">Table #{{ table.seat_no }}</p>
              <p class="font-bold">{{ formatStatus(table.status) }}</p>
              <p class="text-xs text-gray-500" *ngIf="table.challenger_id">Challenger : {{ table.challenger_id }}</p>
              <p class="text-xs text-gray-500" *ngIf="table.game_id">Game : {{ table.game_id }}</p>
            </div>
            <div class="flex flex-col gap-2 items-end">
              <span class="text-xs px-2 py-1 rounded-full border" [class.bg-green-100]="table.status === 'playing'">
                {{ table.status }}
              </span>
              <button
                class="px-3 py-1 text-sm font-semibold border rounded"
                [disabled]="!isHost || table.status === 'open' || !!table.game_id"
                (click)="startTable(table.id)"
              >
                Lancer la partie
              </button>
            </div>
          </div>
        </div>

        <div class="rounded border p-3 bg-gray-50 dark:bg-gray-900 space-y-2">
          <p class="text-xs font-semibold uppercase text-gray-500">Présence live</p>
          <div class="flex items-center gap-2 text-xs text-gray-600" *ngFor="let user of simulPresence$ | async">
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span class="font-semibold">{{ user.username || user.user_id }}</span>
          </div>
          <p *ngIf="(simulPresence$ | async)?.length === 0" class="text-xs text-gray-500">Personne connectée au lobby.</p>
        </div>
      </div>

      <div class="p-3 rounded border bg-blue-50 text-blue-700" *ngIf="liveUpdatesSummary">
        {{ liveUpdatesSummary }}
      </div>

    </div>

    <ng-template #loading>
      <div class="p-4 border rounded-md">Chargement de la simultanée...</div>
    </ng-template>
  `,
})
export class SimulLobbyComponent implements OnChanges, OnDestroy {
  private supabaseAuth = inject(SupabaseClientService);
  private realtimeSimul = inject(RealtimeSimulService);
  simulService = inject(SupabaseSimulService);
  private tablesSub?: Subscription;
  private lastSimulId?: string;

  @Input({ required: true }) simulId!: string;

  liveUpdatesSummary = '';

  simulPresence$ = this.realtimeSimul.presence$;

  get currentUserId() {
    return this.supabaseAuth.currentUser()?.id ?? 'inconnu';
  }

  get isHost() {
    return this.simulService.activeSimul()?.host_id === this.supabaseAuth.currentUser()?.id;
  }

  get reservedCount() {
    const simul = this.simulService.activeSimul();
    if (!simul) return 0;
    return simul.simul_tables.filter((t) => t.status !== 'open').length;
  }

  ngOnChanges(): void {
    if (!this.simulId || this.simulId === this.lastSimulId) return;

    this.lastSimulId = this.simulId;

    this.simulService
      .fetchSimul(this.simulId)
      .then(() => {
        const tables = this.simulService.activeSimul()?.simul_tables ?? [];
        const mappedTables = tables.map(table => ({
            ...table,
            guest_id: table.challenger_id
        }));
        this.realtimeSimul.preloadTables(mappedTables);
      })
      .catch((err) => {
        this.simulService.error.set(this.simulService.friendlyError(err));
      });

    this.subscribeRealtime();
  }

  ngOnDestroy(): void {
    this.tablesSub?.unsubscribe();
    void this.realtimeSimul.teardown();
  }

  formatStatus(status: SimulTableStatus) {
    const map: Record<SimulTableStatus, string> = {
      open: 'Disponible',
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

  private subscribeRealtime() {
    this.liveUpdatesSummary = '';

    const user = this.supabaseAuth.currentUser();
    const presence: PresenceUser | undefined = user
      ? { user_id: user.id, username: (user.user_metadata as any)?.username || user.email || 'user' }
      : undefined;

    this.realtimeSimul.subscribe(this.simulId, presence);

    this.tablesSub?.unsubscribe();
    this.tablesSub = this.realtimeSimul.tables$.subscribe((updates) => {
      const active = this.simulService.activeSimul();
      if (!active || updates.length === 0) return;

      const mergedTables = active.simul_tables.map((table) => {
        const updatedTable = updates.find((u) => u.id === table.id);
        if (updatedTable) {
          return {
            ...table,
            ...updatedTable,
            challenger_id: updatedTable.guest_id ?? updatedTable.challenger_id,
            status: updatedTable.status as SimulTableStatus
          };
        }
        return table;
      });
      this.simulService.activeSimul.set({ ...active, simul_tables: mergedTables });

      const lastUpdate = updates[updates.length - 1];
      this.liveUpdatesSummary = `Table #${lastUpdate.seat_no ?? '?'} -> ${lastUpdate.status ?? 'update'}`;
    });
  }
}