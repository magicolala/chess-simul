import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-forced-piece-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
      <div
        class="px-3 py-1 text-xs font-black uppercase rounded-[2px] border border-[#1D1C1C]"
        [class.bg-emerald-200]="status() === 'ready'"
        [class.bg-amber-200]="status() === 'thinking'"
        [class.bg-gray-200]="status() === 'idle'"
      >
        🤖 {{ statusLabel() }}
      </div>
      @if (square()) {
        <div class="text-[11px] font-black text-[#1D1C1C] bg-white/80 px-2 py-1 rounded-[2px] border border-[#1D1C1C]">
          Pièce imposée : {{ square()!.toUpperCase() }}
        </div>
      }
    </div>

    @if (square()) {
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute" [ngStyle]="getPositionStyle()" aria-label="Forced piece highlight">
          <div
            class="w-full h-full rounded-full border-4 border-[#7AF7F7] bg-[#7AF7F7]/30 shadow-[0_0_0_4px_rgba(122,247,247,0.35)] animate-pulse"
          ></div>
        </div>
      </div>
    }
  `
})
export class ForcedPieceOverlayComponent {
  square = input<string | null>(null);
  orientation = input<'w' | 'b'>('w');
  status = input<'idle' | 'thinking' | 'ready'>('idle');

  private files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  statusLabel = computed(() => {
    switch (this.status()) {
      case 'thinking':
        return 'Réflexion en cours';
      case 'ready':
        return 'Pièce imposée prête';
      default:
        return 'En attente';
    }
  });

  getPositionStyle(): Record<string, string> {
    const square = this.square();
    if (!square) return {};

    const fileIndex = this.files.indexOf(square[0]);
    const rank = parseInt(square[1], 10);
    if (fileIndex === -1 || Number.isNaN(rank)) return {};

    const size = 12.5;
    const orientation = this.orientation();
    const leftIndex = orientation === 'w' ? fileIndex : 7 - fileIndex;
    const bottomIndex = orientation === 'w' ? rank - 1 : 8 - rank;

    return {
      left: `${leftIndex * size}%`,
      bottom: `${bottomIndex * size}%`,
      width: `${size}%`,
      height: `${size}%`
    };
  }
}
