import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from './chess-board.component';
import { AnalysisService, AnalysisNode } from '../services/analysis.service';
import { Chess, Move } from 'chess.js';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FormsModule],
  template: `
    <div
      class="h-full max-w-[1920px] mx-auto p-4 flex flex-col lg:flex-row gap-4 lg:gap-0 font-sans bg-gray-100 dark:bg-[#0a0a0a]"
    >
      <!-- Center: Board & Eval -->
      <div class="flex-1 flex justify-center items-start lg:items-center relative">
        <div class="flex w-full max-w-4xl gap-2">
          <!-- Evaluation Bar -->
          <div
            class="w-8 h-[60vh] lg:h-[80vh] bg-gray-300 border-2 border-[#1D1C1C] dark:border-white relative overflow-hidden flex flex-col justify-end"
          >
            <!-- Black Bar (Top part is empty/black background) -->
            <div class="absolute top-0 w-full h-full bg-[#404040]"></div>
            <!-- White Bar (Height depends on eval) -->
            <div
              class="w-full bg-white transition-all duration-500 relative z-10"
              [style.height.%]="evalHeight()"
            ></div>

            <!-- Eval Text -->
            <div
              class="absolute top-2 left-0 w-full text-center text-[10px] font-black text-white z-20"
              *ngIf="evalHeight() < 50"
            >
              {{ evalText() }}
            </div>
            <div
              class="absolute bottom-2 left-0 w-full text-center text-[10px] font-black text-[#1D1C1C] z-20"
              *ngIf="evalHeight() >= 50"
            >
              {{ evalText() }}
            </div>
          </div>

          <!-- Board -->
          <div class="flex-1 aspect-square max-h-[80vh]">
            <app-chess-board
              [fen]="currentFen()"
              [lastMove]="lastMove()"
              [bestMove]="engineData()?.bestMove || null"
              [isInteractive]="true"
              [allowedColor]="'both'"
              (move)="onUserMove($event)"
            >
            </app-chess-board>
          </div>
        </div>
      </div>

      <!-- Right: Analysis Tools -->
      <div class="ui-card w-full lg:w-96 flex flex-col h-[60vh] lg:h-auto">
        <!-- Header Tabs -->
        <div class="ui-card-footer flex">
          <button
            (click)="tab.set('moves')"
            [class.bg-[#1D1C1C]]="tab() === 'moves'"
            [class.text-white]="tab() === 'moves'"
            class="ui-btn ui-btn-ghost flex-1 py-3 text-xs"
          >
            Coups
          </button>
          <button
            (click)="tab.set('pgn')"
            [class.bg-[#1D1C1C]]="tab() === 'pgn'"
            [class.text-white]="tab() === 'pgn'"
            class="ui-btn ui-btn-ghost flex-1 py-3 text-xs"
          >
            Import PGN
          </button>
        </div>

        <!-- Engine Output -->
        <div
          class="p-4 bg-gray-50 dark:bg-[#121212] border-b-2 border-[#1D1C1C] dark:border-white min-h-[100px] flex flex-col justify-center"
        >
          @if (isAnalyzing()) {
            <div class="flex items-center space-x-2 text-gray-500 animate-pulse">
              <span class="text-xl">⚙️</span>
              <span class="text-xs font-bold uppercase">Calcul en cours...</span>
            </div>
          } @else if (engineData()) {
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-black text-gray-400 uppercase mb-1">Évaluation</p>
                <p class="text-2xl font-black font-mono text-[#1D1C1C] dark:text-white">
                  {{ evalText() }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs font-black text-gray-400 uppercase mb-1">Meilleur Coup</p>
                <p class="text-lg font-bold text-[#7AF7F7] bg-[#1D1C1C] px-2 py-0.5 inline-block">
                  {{ engineData()?.bestMove || '-' }}
                </p>
              </div>
            </div>
            @if (engineData()?.classification) {
              <div
                class="mt-2 text-xs font-bold uppercase px-2 py-1 inline-block border-2"
                [class.border-green-500]="
                  engineData()?.classification === 'best' ||
                  engineData()?.classification === 'brilliant'
                "
                [class.text-green-600]="
                  engineData()?.classification === 'best' ||
                  engineData()?.classification === 'brilliant'
                "
                [class.border-red-500]="
                  engineData()?.classification === 'blunder' ||
                  engineData()?.classification === 'mistake'
                "
                [class.text-red-600]="
                  engineData()?.classification === 'blunder' ||
                  engineData()?.classification === 'mistake'
                "
              >
                {{ engineData()?.classification }}
              </div>
            }
          } @else {
            <p class="text-xs text-gray-400 text-center italic">
              Faites un coup pour lancer l'analyse.
            </p>
          }
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a]">
          @if (tab() === 'moves') {
            <div class="grid grid-cols-2 text-sm font-mono font-bold">
              @for (movePair of moveList(); track $index) {
                <div
                  class="p-2 border-b border-gray-100 dark:border-gray-800 flex items-center bg-gray-50 dark:bg-[#121212] text-gray-500 border-r dark:border-gray-700 justify-center"
                >
                  {{ $index + 1 }}.
                </div>
                <div class="col-span-1 grid grid-cols-2">
                  <div
                    (click)="jumpToMove(movePair.white.index)"
                    class="p-2 cursor-pointer hover:bg-[#FFF48D] dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                    [class.bg-[#FFF48D]]="currentMoveIndex() === movePair.white.index"
                    [class.dark:bg-gray-700]="currentMoveIndex() === movePair.white.index"
                    [class.dark:text-white]="true"
                  >
                    {{ movePair.white.san }}
                  </div>
                  @if (movePair.black) {
                    <div
                      (click)="jumpToMove(movePair.black.index)"
                      class="p-2 cursor-pointer hover:bg-[#FFF48D] dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                      [class.bg-[#FFF48D]]="currentMoveIndex() === movePair.black.index"
                      [class.dark:bg-gray-700]="currentMoveIndex() === movePair.black.index"
                      [class.dark:text-white]="true"
                    >
                      {{ movePair.black.san }}
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (tab() === 'pgn') {
            <div class="p-4">
              <textarea
                [(ngModel)]="pgnInput"
                rows="10"
                class="ui-input font-mono text-xs bg-gray-50 dark:bg-[#121212]"
                placeholder="Collez votre PGN ici..."
              ></textarea>
              <button (click)="loadPgn()" class="ui-btn ui-btn-dark w-full mt-4 py-3">
                Importer
              </button>
            </div>
          }
        </div>

        <!-- Footer Controls -->
        <div class="ui-card-footer p-4 bg-gray-50 dark:bg-[#121212] flex justify-center space-x-1">
          <button (click)="navigate('start')" class="ui-btn ui-btn-ghost w-10 h-10 font-black">
            |&lt;
          </button>
          <button (click)="navigate('prev')" class="ui-btn ui-btn-ghost w-10 h-10 font-black">
            &lt;
          </button>
          <button (click)="navigate('next')" class="ui-btn ui-btn-ghost w-10 h-10 font-black">
            &gt;
          </button>
          <button (click)="navigate('end')" class="ui-btn ui-btn-ghost w-10 h-10 font-black">
            &gt;|
          </button>
        </div>
      </div>
    </div>
  `
})
export class AnalysisComponent {
  analysisService = inject(AnalysisService);

  // Inputs from parent if we want to preload a game
  initialPgn = input<string>('');

  // State
  chess = new Chess();
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  currentMoveIndex = signal(-1); // -1 = Start position
  history: { fen: string; move: Move }[] = [];

  tab = signal<'moves' | 'pgn'>('moves');
  pgnInput = signal('');

  // Analysis State
  engineData = signal<Partial<AnalysisNode> | null>(null);
  isAnalyzing = signal(false);

  // Computed
  evalHeight = computed(() => {
    const data = this.engineData();
    if (!data || data.eval === undefined) return 50;
    // Clamp between -500 and 500 cp for the bar visual
    const score = Math.max(-500, Math.min(500, data.eval));
    // 50% is 0. +500 is 100%, -500 is 0%.
    // Logic: if score 0 -> 50%. if score 500 -> 100%.
    return 50 + score / 10;
  });

  evalText = computed(() => {
    const data = this.engineData();
    if (!data) return '0.0';
    if (data.eval !== undefined) return (data.eval / 100).toFixed(1);
    return 'Mate';
  });

  moveList = computed(() => {
    // Re-calculate move pairs for display
    // History array is mutated, we rely on standard change detection triggered by currentMoveIndex/signals.
    // Ideally, history should be a signal.
    return this.generateMovePairs();
  });

  lastMove = computed(() => {
    if (this.currentMoveIndex() === -1) return null;
    const h = this.history[this.currentMoveIndex()];
    return h ? { from: h.move.from, to: h.move.to } : null;
  });

  constructor() {
    effect(() => {
      if (this.initialPgn()) {
        this.pgnInput.set(this.initialPgn());
        this.loadPgn();
      }
    });
  }

  onUserMove(move: { from: string; to: string }) {
    // Create a temporary chess instance to validate from CURRENT position
    const tempChess = new Chess(this.currentFen());
    try {
      const m = tempChess.move({ from: move.from, to: move.to, promotion: 'q' });
      if (m) {
        // Valid move
        // If we are in the middle of history, we diverge (simple variation support: overwrite future)
        if (this.currentMoveIndex() < this.history.length - 1) {
          this.history = this.history.slice(0, this.currentMoveIndex() + 1);
        }

        this.history.push({ fen: tempChess.fen(), move: m });
        this.currentMoveIndex.update((i) => i + 1);
        this.updateBoardState();
      }
    } catch (error) {
      console.error('Invalid move in analysis board', error);
    }
  }

  loadPgn() {
    try {
      const c = new Chess();
      c.loadPgn(this.pgnInput());

      // Rebuild history array
      this.history = [];
      const historyMoves = c.history({ verbose: true });

      const tempC = new Chess();
      for (const m of historyMoves) {
        tempC.move(m);
        this.history.push({ fen: tempC.fen(), move: m });
      }

      this.navigate('end');
      this.tab.set('moves');
    } catch {
      alert('PGN Invalide');
    }
  }

  navigate(direction: 'start' | 'prev' | 'next' | 'end') {
    const max = this.history.length - 1;
    let curr = this.currentMoveIndex();

    if (direction === 'start') curr = -1;
    if (direction === 'prev') curr = Math.max(-1, curr - 1);
    if (direction === 'next') curr = Math.min(max, curr + 1);
    if (direction === 'end') curr = max;

    this.currentMoveIndex.set(curr);
    this.updateBoardState();
  }

  jumpToMove(index: number) {
    this.currentMoveIndex.set(index);
    this.updateBoardState();
  }

  private updateBoardState() {
    const idx = this.currentMoveIndex();
    const fen =
      idx === -1
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : this.history[idx].fen;

    this.currentFen.set(fen);

    // Trigger Analysis
    this.isAnalyzing.set(true);
    this.analysisService.analyzePosition(fen).then((data) => {
      this.engineData.set(data);
      this.isAnalyzing.set(false);
    });
  }

  private generateMovePairs() {
    const pairs = [];
    for (let i = 0; i < this.history.length; i += 2) {
      pairs.push({
        white: { san: this.history[i].move.san, index: i },
        black: this.history[i + 1] ? { san: this.history[i + 1].move.san, index: i + 1 } : null
      });
    }
    return pairs;
  }
}
