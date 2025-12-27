import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { SupabaseSimulService } from '../services/supabase-simul.service';

@Component({
  selector: 'app-simul-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 border rounded bg-white dark:bg-black" *ngIf="simulService.activeTable(); else empty">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase font-semibold text-gray-500">Table #{{ simulService.activeTable()?.seat_no }}</p>
          <p class="font-bold">Statut : {{ simulService.tableStatus() }}</p>
          <p class="text-sm text-gray-500" *ngIf="simulService.activeTable()?.challenger_id">
            Adversaire : {{ simulService.activeTable()?.challenger_id }}
          </p>
        </div>
        <button class="px-3 py-1 border rounded" (click)="refresh()">Actualiser</button>
      </div>

      <div class="mt-4" *ngIf="simulService.activeGame(); else waiting">
        <p class="text-sm text-gray-500">Game ID : {{ simulService.activeGame()?.id }}</p>
        <p class="text-sm text-gray-500">Etat : {{ simulService.gameStatus() }}</p>
        <p class="font-mono text-xs break-all">FEN : {{ simulService.activeGame()?.fen }}</p>
      </div>
    </div>

    <ng-template #waiting>
      <p class="text-sm text-gray-500">La partie n'a pas encore été créée.</p>
    </ng-template>

    <ng-template #empty>
      <div class="p-4 border rounded">Aucune table réservée pour l'instant.</div>
    </ng-template>
  `,
})
export class SimulBoardComponent implements OnChanges {
  simulService = inject(SupabaseSimulService);

  @Input({ required: true }) tableId!: string;

  ngOnChanges(): void {
    if (this.tableId) {
      this.refresh();
    }
  }

  async refresh() {
    await this.simulService.fetchTableGame(this.tableId);
  }
}
