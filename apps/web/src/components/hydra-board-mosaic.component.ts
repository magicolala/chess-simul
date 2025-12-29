import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { Database } from '@supabase/types/database.types';
import { HydraBoardTileComponent } from './hydra-board-tile.component';

type HydraGameRow = Database['public']['Tables']['hydra_games']['Row'];

export type HydraBoardSortMode = 'start' | 'recent' | 'time';

@Component({
  selector: 'app-hydra-board-mosaic',
  standalone: true,
  imports: [CommonModule, HydraBoardTileComponent],
  template: `
    <section class="grid gap-4" [ngClass]="gridClass">
      <app-hydra-board-tile
        *ngFor="let game of sortedGames"
        [game]="game"
        [highlighted]="game.id === highlightedGameId"
      ></app-hydra-board-tile>
    </section>
  `
})
export class HydraBoardMosaicComponent {
  @Input() games: HydraGameRow[] = [];
  @Input() sortMode: HydraBoardSortMode = 'start';
  @Input() highlightedGameId: string | null = null;

  get sortedGames() {
    const games = [...this.games];
    if (this.sortMode === 'recent') {
      return games.sort((a, b) => this.sortByDate(b.last_move_at, a.last_move_at));
    }
    if (this.sortMode === 'time') {
      return games.sort((a, b) => this.estimateRemaining(a) - this.estimateRemaining(b));
    }
    return games.sort((a, b) => this.sortByDate(a.start_time, b.start_time));
  }

  get gridClass() {
    const count = this.games.length;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  }

  private sortByDate(a?: string | null, b?: string | null) {
    const aTime = a ? new Date(a).getTime() : 0;
    const bTime = b ? new Date(b).getTime() : 0;
    return aTime - bTime;
  }

  private estimateRemaining(game: HydraGameRow) {
    const [minutes] = game.time_control.split('+').map((value) => Number(value));
    const total = Number.isFinite(minutes) ? minutes * 60 : 0;
    const elapsed = (Date.now() - new Date(game.start_time).getTime()) / 1000;
    return Math.max(0, total - elapsed);
  }
}
