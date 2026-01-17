import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessSimulService } from '../services/chess-logic.service';
import { ChessBoardComponent } from './chess-board.component';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-simul-host',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    <div
      class="h-full flex flex-col md:flex-row overflow-hidden font-sans bg-gray-100 dark:bg-[#0a0a0a]"
    >
      <!-- Sidebar: Command Queue -->
      <aside
        class="w-full md:w-72 bg-white dark:bg-[#1a1a1a] border-r-2 border-[#1D1C1C] dark:border-white flex flex-col z-20 shadow-lg"
      >
        <div class="p-4 border-b-2 border-[#1D1C1C] dark:border-white bg-[#1D1C1C] text-white">
          <h2 class="font-black font-display text-lg uppercase">Command Center</h2>
          <div class="flex justify-between items-center mt-2 text-xs font-bold text-gray-300">
            <span>{{ activeCount() }} parties</span>
            <span>1-9 pour accès rapide</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-0 space-y-0">
          <!-- PRIORITY QUEUE -->
          @if (actionRequiredCount() > 0) {
            <div
              class="bg-red-50 dark:bg-red-900/20 px-4 py-2 text-[10px] font-black uppercase text-red-600 tracking-wider border-b border-red-100"
            >
              File Prioritaire ({{ actionRequiredCount() }})
            </div>
            @for (game of actionRequiredGames(); track game.id; let i = $index) {
              <div
                (click)="focusGame(game.id)"
                class="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] cursor-pointer hover:bg-[#FFF48D] dark:hover:bg-gray-800 transition-colors group relative"
                [class.bg-[#FFF48D]]="focusedGameId() === game.id"
              >
                <!-- Keyboard Shortcut Badge -->
                @if (i < 9) {
                  <div
                    class="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#1D1C1C] text-white flex items-center justify-center text-[10px] font-bold opacity-50 group-hover:opacity-100"
                  >
                    {{ i + 1 }}
                  </div>
                }

                <div class="pl-8">
                  <div class="flex justify-between items-center mb-1">
                    <span
                      class="font-black font-display text-sm text-[#1D1C1C] dark:text-white truncate w-24"
                      >{{ game.opponentName }}</span
                    >
                    <span
                      class="text-[10px] font-mono font-bold bg-red-500 text-white px-1.5 py-0.5"
                      >À TOI</span
                    >
                  </div>
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-500">Board #{{ game.id + 1 }}</span>
                    <span class="font-mono font-bold text-[#1D1C1C] dark:text-gray-300">{{
                      formatTime(game.whiteTime)
                    }}</span>
                  </div>
                </div>

                <!-- Selection Indicator -->
                @if (focusedGameId() === game.id) {
                  <div class="absolute right-0 top-0 bottom-0 w-1 bg-[#1D1C1C]"></div>
                }
              </div>
            }
          }

          <!-- WAITING QUEUE -->
          <div
            class="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-[10px] font-black uppercase text-gray-500 tracking-wider border-b border-gray-200 border-t border-gray-200"
          >
            En attente ({{ waitingCount() }})
          </div>
          @for (game of waitingGames(); track game.id) {
            <div
              (click)="focusGame(game.id)"
              class="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#121212] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 opacity-75"
            >
              <div class="flex justify-between items-center">
                <span class="font-bold text-xs text-gray-600 dark:text-gray-400"
                  >#{{ game.id + 1 }} {{ game.opponentName }}</span
                >
                <span class="text-[10px] text-gray-400 font-mono">{{
                  formatTime(game.whiteTime)
                }}</span>
              </div>
            </div>
          }
        </div>
      </aside>

      <!-- Main Area -->
      <main class="flex-1 flex flex-col relative overflow-hidden bg-gray-200 dark:bg-[#000]">
        <div
          class="ui-card p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <p class="text-xs font-black uppercase text-gray-500">Score Hydra</p>
            <div class="flex items-end space-x-3">
              <span class="text-4xl md:text-5xl font-black text-[#1D1C1C] dark:text-white">{{
                simulService.hydraScoreboard().totalPoints
              }}</span>
              <div class="flex space-x-2 text-xs font-bold uppercase text-gray-500">
                <span class="px-2 py-1 bg-green-100 text-green-700 border border-green-200"
                  >+3 Win</span
                >
                <span class="px-2 py-1 bg-gray-100 text-gray-600 border border-gray-200"
                  >+1 Draw</span
                >
                <span class="px-2 py-1 bg-red-100 text-red-600 border border-red-200">-1 Loss</span>
              </div>
            </div>
            <p class="text-sm text-gray-500 font-medium mt-1">
              {{ simulService.hydraScoreboard().activeBoards }} tables actives • potentiel restant
              {{ simulService.hydraScoreboard().potential }} pts
            </p>
          </div>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-[#FFF48D] border-2 border-[#1D1C1C] px-4 py-3 font-black">
              {{ simulService.hydraScoreboard().wins }} victoires
            </div>
            <div class="bg-white border-2 border-[#1D1C1C] px-4 py-3 font-black">
              {{ simulService.hydraScoreboard().draws }} nulles
            </div>
            <div class="bg-white border-2 border-[#1D1C1C] px-4 py-3 font-black text-red-600">
              {{ simulService.hydraScoreboard().losses }} défaites
            </div>
          </div>
        </div>

        <!-- Grid View (Zoomed Out) -->
        @if (!isFocusedMode()) {
          <div class="flex-1 overflow-y-auto p-4 md:p-8 bg-nano-banana">
            <div
              class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6"
            >
              @for (game of games(); track game.id) {
                <div
                  class="ui-card p-2 hover:scale-[1.02] transition-transform relative flex flex-col group"
                  [class.ring-4]="game.requiresAttention"
                  [class.ring-green-400]="game.requiresAttention"
                  (click)="focusGame(game.id)"
                >
                  <!-- Header -->
                  <div class="mb-2 flex justify-between items-center z-10 px-1">
                    <span class="font-black font-display text-sm">#{{ game.id + 1 }}</span>
                    <div class="flex items-center space-x-1">
                      <span class="text-[10px] font-bold truncate max-w-[80px]">{{
                        game.opponentName
                      }}</span>
                      <div
                        class="w-2 h-2 rounded-full"
                        [class.bg-green-500]="game.requiresAttention"
                        [class.bg-gray-300]="!game.requiresAttention"
                      ></div>
                    </div>
                  </div>

                  <!-- Non-Interactive Preview Board -->
                  <div class="flex-1 aspect-square relative z-0 pointer-events-none">
                    <app-chess-board
                      [fen]="game.fen"
                      [lastMove]="game.lastMove"
                      [isInteractive]="false"
                      [allowedColor]="'w'"
                    >
                    </app-chess-board>
                  </div>

                  <!-- Overlay Action Button -->
                  @if (game.isHostTurn) {
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button class="ui-btn ui-btn-dark text-xs px-3 py-1 transform scale-110">
                        JOUER
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Focused Mode (One Board) -->
        @else if (focusedGame(); as game) {
          <div class="flex-1 flex flex-col md:flex-row bg-gray-100 dark:bg-[#121212] h-full">
            <!-- Game Board Area -->
            <div class="flex-1 flex items-center justify-center p-4 md:p-8 bg-nano-banana relative">
              <button
                (click)="exitFocus()"
                class="ui-btn ui-btn-ghost absolute top-4 left-4 px-3 py-1 text-sm z-20 flex items-center"
              >
                <span class="text-lg mr-1">⊞</span> GRILLE (ESC)
              </button>

              <!-- Navigation Arrows -->
              <button
                (click)="cycleGame(-1)"
                class="ui-btn ui-btn-ghost absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 font-black text-xl z-20"
              >
                ←
              </button>
              <button
                (click)="cycleGame(1)"
                class="ui-btn ui-btn-ghost absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 font-black text-xl z-20"
              >
                →
              </button>

              <div
                class="w-full max-w-[85vh] aspect-square bg-white dark:bg-black border-4 border-[#1D1C1C] dark:border-white shadow-2xl relative"
              >
                <!-- Action Indicator inside board -->
                @if (game.isHostTurn) {
                  <div class="absolute top-0 w-full h-2 bg-red-500 z-30 animate-pulse"></div>
                }

                <app-chess-board
                  [fen]="game.fen"
                  [lastMove]="game.lastMove"
                  [isInteractive]="game.isHostTurn"
                  [allowedColor]="'w'"
                  [allowPremoves]="prefs.gameSettings().allowPremoves"
                  (move)="onMove(game.id, $event)"
                >
                </app-chess-board>
              </div>
            </div>

            <!-- Info Panel (Right) -->
            <div
              class="ui-card w-full md:w-80 flex flex-col z-20 shadow-xl border-l-2 border-[#1D1C1C] dark:border-white"
            >
              <!-- Challenger Profile -->
              <div class="ui-card-header p-6 text-center bg-gray-50 dark:bg-[#0f0f0f]">
                <img
                  [src]="game.opponentAvatar"
                  class="w-20 h-20 mx-auto border-4 border-[#1D1C1C] bg-white rounded-full mb-3"
                />
                <h3 class="text-xl font-black font-display uppercase truncate">
                  {{ game.opponentName }}
                </h3>
                <p class="text-sm text-gray-500 font-mono font-bold">
                  {{ game.opponentRating }} ELO
                </p>
                <div
                  class="mt-4 inline-block bg-[#1D1C1C] text-white px-3 py-1 font-mono font-bold text-lg rounded-[2px]"
                >
                  {{ formatTime(game.whiteTime) }}
                </div>
              </div>

              <!-- Content Area (Simplified to Moves for focus) -->
              <div class="flex-1 overflow-y-auto bg-white dark:bg-[#121212] flex flex-col p-4">
                <h4
                  class="text-xs font-black uppercase text-gray-400 mb-2 border-b border-gray-200 pb-1"
                >
                  Derniers coups
                </h4>
                <div class="font-mono text-xs space-y-1">
                  @for (move of game.history.slice(-10); track $index) {
                    @if ($index % 2 === 0) {
                      <div class="flex border-b border-gray-100 dark:border-gray-800 py-1">
                        <span class="w-8 text-gray-400 select-none">...</span>
                        <span class="w-16 font-bold text-[#1D1C1C] dark:text-gray-300">{{
                          move
                        }}</span>
                        <span class="w-16 font-bold text-[#1D1C1C] dark:text-gray-300">{{
                          game.history.slice(-10)[$index + 1] || ''
                        }}</span>
                      </div>
                    }
                  }
                </div>
              </div>

              <!-- Footer -->
              <div class="ui-card-footer p-4 bg-gray-50 dark:bg-[#0f0f0f]">
                <button class="ui-btn ui-btn-ghost w-full py-3 text-sm text-red-600">
                  Déclarer Victoire / Nulle
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `
})
export class SimulHostComponent {
  simulService = inject(ChessSimulService);
  prefs = inject(PreferencesService);

  games = this.simulService.games;

  focusedGameId = signal<number | null>(null);

  // Computed helpers
  activeCount = computed(() => this.games().filter((g) => g.status === 'active').length);
  actionRequiredGames = computed(() =>
    this.games().filter(
      (g) => g.status === 'active' && (g.requiresAttention || g.history.length === 0)
    )
  );
  waitingGames = computed(() =>
    this.games().filter((g) => g.status === 'active' && !g.requiresAttention)
  );
  actionRequiredCount = computed(() => this.actionRequiredGames().length);
  waitingCount = computed(() => this.waitingGames().length);

  focusedGame = computed(() => {
    const id = this.focusedGameId();
    return id !== null ? this.games().find((g) => g.id === id) : null;
  });

  isFocusedMode = computed(() => this.focusedGameId() !== null);

  // Keyboard Shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.exitFocus();
    }
    if (event.key === 'ArrowRight') {
      this.cycleGame(1);
    }
    if (event.key === 'ArrowLeft') {
      this.cycleGame(-1);
    }

    // Number keys 1-9 to select priority games
    const num = parseInt(event.key);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      const priorityGames = this.actionRequiredGames();
      if (priorityGames[num - 1]) {
        this.focusGame(priorityGames[num - 1].id);
      }
    }
  }

  focusGame(id: number) {
    this.focusedGameId.set(id);
  }

  exitFocus() {
    this.focusedGameId.set(null);
  }

  cycleGame(direction: number) {
    const games = this.games(); // Cycle through all or just active? Let's cycle all active.
    const active = games.filter((g) => g.status === 'active');
    if (active.length === 0) {
      return;
    }

    const currentId = this.focusedGameId();
    let currentIndex = active.findIndex((g) => g.id === currentId);

    if (currentIndex === -1) {
      currentIndex = 0;
    } else {
      currentIndex = (currentIndex + direction + active.length) % active.length;
    }

    this.focusGame(active[currentIndex].id);
  }

  onMove(gameId: number, move: { from: string; to: string }) {
    this.simulService.makeMove(gameId, move.from, move.to);
    // Optional: Auto-advance to next priority game?
    // const next = this.actionRequiredGames().find(g => g.id !== gameId);
    // if (next) this.focusGame(next.id);
  }

  formatTime(ms: number): string {
    if (ms < 0) {
      ms = 0;
    }
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
