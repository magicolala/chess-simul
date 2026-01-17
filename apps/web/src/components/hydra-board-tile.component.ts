import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { Database } from '@supabase/types/database.types';

type HydraGameRow = Database['public']['Tables']['hydra_games']['Row'];

@Component({
  selector: 'app-hydra-board-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="ui-card p-3" [class.ring-4]="highlighted" [class.ring-[#7AF7F7]]="highlighted">
      <header class="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>Partie #{{ game.id.slice(0, 6) }}</span>
        <span class="ui-chip text-[10px] bg-gray-100">
          {{ game.status }}
        </span>
      </header>
      <div class="flex items-center justify-between text-sm font-semibold text-gray-700">
        <span>Blanc: {{ game.white_player_id.slice(0, 6) }}</span>
        <span>Noir: {{ game.black_player_id.slice(0, 6) }}</span>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Cadence {{ game.time_control }}</span>
        <span>Temps restant ~ {{ estimatedSecondsRemaining }}s</span>
      </div>
      <div
        class="mt-3 flex h-40 items-center justify-center border-2 border-[#1D1C1C] bg-[#1D1C1C] text-xs text-white"
      >
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
    if (!Number.isFinite(minutes)) {
      return 0;
    }
    const elapsed = (Date.now() - new Date(this.game.start_time).getTime()) / 1000;
    const total = minutes * 60;
    return Math.max(0, Math.round(total - elapsed));
  }
}
