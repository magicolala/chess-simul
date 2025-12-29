import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { Database } from '@supabase/types/database.types';

type HydraGameRow = Database['public']['Tables']['hydra_games']['Row'];

@Component({
  selector: 'app-hydra-board-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      [class.ring-2]="highlighted"
      [class.ring-emerald-400]="highlighted"
    >
      <header class="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Partie #{{ game.id.slice(0, 6) }}</span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
          {{ game.status }}
        </span>
      </header>
      <div class="flex items-center justify-between text-sm font-semibold text-slate-700">
        <span>Blanc: {{ game.white_player_id.slice(0, 6) }}</span>
        <span>Noir: {{ game.black_player_id.slice(0, 6) }}</span>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Cadence {{ game.time_control }}</span>
        <span>Temps restant ~ {{ estimatedSecondsRemaining }}s</span>
      </div>
      <div class="mt-3 flex h-40 items-center justify-center rounded-lg bg-slate-900/90 text-xs text-white">
        Plateau Hydra
      </div>
    </article>
  `
})
export class HydraBoardTileComponent {
  @Input({ required: true }) game!: HydraGameRow;
  @Input() highlighted = false;

  get estimatedSecondsRemaining() {
    const [minutes] = this.game.time_control.split('+').map((value) => Number(value));
    if (!Number.isFinite(minutes)) return 0;
    const elapsed = (Date.now() - new Date(this.game.start_time).getTime()) / 1000;
    const total = minutes * 60;
    return Math.max(0, Math.round(total - elapsed));
  }
}
