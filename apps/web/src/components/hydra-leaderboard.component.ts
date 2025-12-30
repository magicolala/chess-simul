import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type LeaderboardEntry = {
  playerId: string;
  scoreTotal: number;
  rank: number;
  eliminatedAt?: string | null;
};

@Component({
  selector: 'app-hydra-leaderboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ui-card p-4">
      <header class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-black uppercase text-gray-700">Classement Hydra</h3>
        <span class="ui-chip text-xs text-gray-500">Live</span>
      </header>
      <ol class="space-y-2">
        <li
          *ngFor="let entry of entries"
          class="ui-card flex items-center justify-between px-3 py-2 text-sm"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-400">#{{ entry.rank }}</span>
            <span class="font-medium text-gray-700">{{ entry.playerId.slice(0, 8) }}</span>
            <span *ngIf="entry.eliminatedAt" class="text-[10px] text-rose-500">Eliminé</span>
          </div>
          <span class="font-semibold text-[#1D1C1C]">{{ entry.scoreTotal }}</span>
        </li>
      </ol>
    </section>
  `
})
export class HydraLeaderboardComponent {
  @Input() entries: LeaderboardEntry[] = [];
}
