import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RoundRobinSimulService } from '../services/round-robin-simul.service';

@Component({
  selector: 'app-round-robin-games',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-card p-6 space-y-4">
      <div>
        <p class="ui-label">Vos parties</p>
        <h3 class="text-xl font-black font-display">Round Robin</h3>
      </div>

      @if (games().length) {
        <ul class="space-y-2">
          @for (game of games(); track game.id) {
            <li class="flex items-center justify-between border p-3 bg-white/80">
              <div>
                <p class="font-bold">Partie {{ (game.gameId ?? game.id).slice(0, 6) }}</p>
                <p class="text-xs text-gray-500">
                  {{ game.whiteId.slice(0, 6) }} vs {{ game.blackId.slice(0, 6) }}
                </p>
              </div>
              <span class="text-xs uppercase tracking-widest text-gray-500">
                {{ game.status ?? 'en cours' }}
              </span>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-gray-500">Aucune partie générée pour le moment.</p>
      }
    </div>
  `
})
export class RoundRobinGamesComponent {
  games = computed(() => this.simulService.games());

  constructor(private simulService: RoundRobinSimulService) {}
}
