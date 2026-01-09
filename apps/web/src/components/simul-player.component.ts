import { Component, inject, signal, computed, effect, OnDestroy, Input, OnChanges, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from './chess-board.component';
import { RealtimeGameService } from '../services/realtime-game.service';
import { SupabaseSimulService } from '../services/supabase-simul.service';
import { SupabaseClientService } from '../services/supabase-client.service';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-simul-player',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    @if (game(); as g) {
      <div class="h-full flex flex-col items-center justify-center p-4 font-sans max-w-5xl mx-auto">
        <!-- Banner -->
        <div class="ui-card bg-[#1D1C1C] text-white p-4 mb-4 w-full flex justify-between items-center shadow-lg">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-full border-2 border-white bg-white flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h2 class="text-xl font-black font-display uppercase leading-none">
                Simultanée vs {{ simul()?.host_id?.substring(0,8) }}
              </h2>
              <p class="text-xs text-gray-400 font-mono mt-1 uppercase font-bold">Vous jouez les Noirs</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black font-mono" [class.text-[#FFF48D]]="isMyTurn()">
              {{ formatTime(myTime()) }}
            </div>
          </div>
        </div>

        <!-- Main Game Area -->
        <div class="ui-card p-6 w-full gap-8 flex flex-col md:flex-row relative bg-white dark:bg-[#1a1a1a]">
          <!-- Status Overlay (When host turn) -->
          @if (!isMyTurn() && g.status === 'active') {
            <div class="absolute inset-0 z-20 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none transition-all">
              <div class="ui-card bg-[#1D1C1C] text-white px-6 py-3 border-2 border-white animate-pulse">
                <p class="font-black uppercase text-lg">Tour de l'hôte...</p>
              </div>
            </div>
          }

          <!-- Board -->
          <div class="flex-1 flex justify-center">
            <div class="w-full max-w-[60vh] aspect-square wero-shadow">
              <app-chess-board
                [fen]="g.fen"
                [lastMove]="parseUci(g.last_move_uci)"
                [isInteractive]="g.status === 'active' && isMyTurn()"
                [allowedColor]="'b'"
                [orientation]="'b'"
                [allowPremoves]="prefs.gameSettings().allowPremoves"
                (move)="onMove($event)"
              >
              </app-chess-board>
            </div>
          </div>

          <!-- Sidebar info -->
          <div class="w-full md:w-64 flex flex-col space-y-4">
            <!-- Last Move -->
            <div class="ui-card p-4 bg-gray-50 dark:bg-[#121212] border-2 border-[#1D1C1C] dark:border-white">
              <p class="text-xs font-bold text-gray-500 uppercase mb-1">Dernier coup</p>
              <p class="text-xl font-mono font-black text-[#1D1C1C] dark:text-white uppercase">
                {{ g.last_move_uci || '-' }}
              </p>
            </div>

            <!-- Game Over -->
            @if (g.status !== 'active') {
              <div class="p-4 bg-yellow-100 border-2 border-yellow-500 text-yellow-900 font-black text-center uppercase animate-bounce">
                Partie terminée
              </div>
            }

            <button (click)="resign()" class="ui-btn ui-btn-ghost w-full py-3 text-sm text-red-600 font-bold border-red-100" [disabled]="g.status !== 'active'">
              🏳 Abandonner
            </button>
            <button (click)="leave()" class="ui-btn ui-btn-dark w-full py-3 text-sm font-black uppercase">
              Quitter
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="h-full flex items-center justify-center font-display">
        <div class="text-center">
          <p class="text-2xl font-black uppercase mb-2 animate-pulse">Connexion à la table...</p>
        </div>
      </div>
    }
  `
})
export class SimulPlayerComponent implements OnChanges, OnDestroy {
  realtime = inject(RealtimeGameService);
  simulService = inject(SupabaseSimulService);
  supabase = inject(SupabaseClientService);
  auth = inject(AuthService);
  prefs = inject(PreferencesService);

  @Input() tableId?: string;
  
  game = this.realtime.game;
  simul = signal<unknown | null>(null);

  constructor() {
    effect(() => {
      const gId = this.simulService.activeTable()?.game_id;
      if (gId) {
        // console.log('[SimulPlayer] Subscribing to game:', gId);
        const user = this.auth.currentUser();
        this.realtime.subscribe(gId, user ? {
          user_id: user.id,
          username: user.name
        } : undefined);
      }
    });
  }

  async ngOnChanges() {
    if (this.tableId) {
      // Fetch table details if not already in context
      await this.simulService.fetchTableGame(this.tableId);
      this.simul.set(this.simulService.activeSimul());
    }
  }

  ngOnDestroy() {
    this.realtime.teardown();
  }

  isMyTurn = computed(() => {
    const g = this.game();
    return g?.status === 'active' && g.turn === 'b';
  });

  myTime = computed(() => {
    const clocks = this.game()?.clocks as { black: number } | undefined;
    return clocks?.black ?? 0;
  });

  async onMove(move: { from: string; to: string; promotion?: string }) {
    const gId = this.game()?.id;
    if (!gId) return;

    const uci = `${move.from}${move.to}${move.promotion || ''}`;
    try {
      await this.realtime.submitMove(gId, uci);
    } catch (e: unknown) {
      console.error('[SimulPlayer] Move failed:', (e as Error).message);
    }
  }

  async resign() {
    if (!confirm('Abandonner la simultanée ?')) return;
    const gId = this.game()?.id;
    if (!gId) return;

    try {
        await this.realtime.resignGame(gId);
    } catch (e: unknown) {
        alert('Erreur: ' + (e as Error).message);
    }
  }

  quit = output<void>(); // Add output

  leave() {
    this.simulService.clearContext();
    this.quit.emit();
  }

  formatTime(ms: number | undefined): string {
    if (ms === undefined) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  parseUci(uci: string | null | undefined) {
    if (!uci || uci.length < 4) return null;
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4)
    };
  }
}
