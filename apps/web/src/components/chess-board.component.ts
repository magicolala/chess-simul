
import { Component, input, output, computed, signal, effect, ChangeDetectionStrategy, untracked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full aspect-square select-none rounded-[2px] overflow-hidden border-2 border-[#1D1C1C]">
      <!-- Board Grid -->
      <div class="grid grid-cols-8 grid-rows-8 w-full h-full">
        @for (rank of currentRanks(); track rank) {
          @for (file of currentFiles(); track file) {
            @let squareId = file + rank;
            @let isLight = isSquareLight(file, rank);
            @let piece = getPiece(squareId);
            @let isSelected = selectedSquare() === squareId;
            @let isLastMove = lastMove()?.from === squareId || lastMove()?.to === squareId;
            @let isCheck = isKingInCheck(piece);
            
            <!-- Analysis Highlights -->
            @let isBestMoveSource = bestMove()?.substring(0, 2) === squareId;
            @let isBestMoveDest = bestMove()?.substring(2, 4) === squareId;

            <!-- Logic for interaction -->
            @let canInteract = isInteractive() && (allowedColor() === 'both' ? piece?.color === chess().turn() : piece?.color === allowedColor());
            
            @let isLegal = isLegalMove(squareId);

            <div 
              (click)="handleSquareClick(squareId)"
              (dragover)="handleDragOver($event)"
              (drop)="handleDrop($event, squareId)"
              class="relative w-full h-full flex items-center justify-center transition-colors duration-75"
              [class.cursor-pointer]="canInteract || isLegal"
              [style.backgroundColor]="getSquareColor(isLight, isLastMove, isSelected, isBestMoveSource, isBestMoveDest)"
            >
              
              <!-- Rank/File Labels -->
              @if ((file === 'a' && orientation() === 'w') || (file === 'h' && orientation() === 'b')) {
                <span class="absolute top-0.5 left-1 text-[10px] font-bold z-0"
                      [style.color]="isLight ? prefs.currentTheme.dark : prefs.currentTheme.light">
                  {{ rank }}
                </span>
              }
              
              @if ((rank === 1 && orientation() === 'w') || (rank === 8 && orientation() === 'b')) {
                <span class="absolute bottom-0 right-1 text-[10px] font-bold z-0"
                      [style.color]="isLight ? prefs.currentTheme.dark : prefs.currentTheme.light">
                  {{ file }}
                </span>
              }

              <!-- Move Hint Dot (Legal Move) -->
              @if (isLegal) {
                <div class="absolute w-4 h-4 rounded-full z-10 pointer-events-none opacity-50"
                     [class.w-full]="piece"
                     [class.h-full]="piece"
                     [class.rounded-none]="piece"
                     [class.ring-4]="piece"
                     [style.backgroundColor]="piece ? '#1D1C1C' : '#1D1C1C'"
                     [style.boxShadow]="piece ? 'inset 0 0 0 4px #1D1C1C' : 'none'"
                ></div>
              }

              <!-- King Check Gradient -->
              @if (isCheck) {
                <div class="absolute inset-0 bg-red-500/80 z-0"></div>
              }

              <!-- Piece -->
              @if (piece) {
                <img 
                  [src]="getPieceUrl(piece)" 
                  [draggable]="canInteract"
                  (dragstart)="handleDragStart($event, squareId)"
                  (dragend)="handleDragEnd()"
                  class="w-[85%] h-[85%] z-20 select-none transition-transform duration-200"
                  [class.cursor-grab]="canInteract"
                  [class.active:cursor-grabbing]="canInteract"
                  [class.opacity-50]="draggingSquare() === squareId"
                  alt="piece"
                />
              }

            </div>
          }
        }
      </div>
      
      <!-- Interaction Blocker if not active -->
      @if (!isInteractive()) {
        <div class="absolute inset-0 z-30"></div>
      }
    </div>
  `
})
export class ChessBoardComponent {
  prefs = inject(PreferencesService);

  fen = input.required<string>();
  lastMove = input<{ from: string, to: string } | null>(null);
  bestMove = input<string | null>(null); // e.g. "e2e4"
  isInteractive = input<boolean>(false);
  orientation = input<'w' | 'b'>('w');
  allowedColor = input<'w' | 'b' | 'both'>('w'); 
  
  move = output<{ from: string, to: string }>();

  private baseRanks = [8, 7, 6, 5, 4, 3, 2, 1];
  private baseFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // Computed arrays for rendering based on orientation
  currentRanks = computed(() => this.orientation() === 'w' ? this.baseRanks : [...this.baseRanks].reverse());
  currentFiles = computed(() => this.orientation() === 'w' ? this.baseFiles : [...this.baseFiles].reverse());

  // Reactive Chess Instance
  public chess = computed(() => {
    const c = new Chess();
    try {
      c.load(this.fen());
    } catch (e) {
      // Silent catch
    }
    return c;
  });

  selectedSquare = signal<string | null>(null);
  draggingSquare = signal<string | null>(null); 
  legalMoves = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.fen();
      untracked(() => {
        this.selectedSquare.set(null);
        this.draggingSquare.set(null);
        this.legalMoves.set([]);
      });
    });
  }

  isSquareLight(file: string, rank: number): boolean {
    const fileIdx = this.baseFiles.indexOf(file);
    const rankIdx = rank - 1;
    return (fileIdx + rankIdx) % 2 !== 0;
  }

  getSquareColor(isLight: boolean, isLastMove: boolean, isSelected: boolean, isBestFrom: boolean, isBestTo: boolean): string {
    const theme = this.prefs.currentTheme;
    const CYAN = '#7AF7F7';
    const ENGINE_BLUE = 'rgba(60, 100, 255, 0.5)';

    if (isSelected) return CYAN; 
    
    // Engine Suggestion Overlay
    if (isBestTo || isBestFrom) return isLight ? '#a5b4fc' : '#818cf8'; // Indigo-ish

    if (isLastMove) return isLight ? '#d4fdfd' : '#aefbfb';

    return isLight ? theme.light : theme.dark;
  }

  getPiece(square: string) {
    return this.chess().get(square as any);
  }

  getPieceUrl(piece: { type: string; color: 'w' | 'b' }): string {
    const theme = this.prefs.activePieceSetId();
    const name = `${piece.color}${piece.type.toUpperCase()}`;
    return `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${theme}/${name}.svg`;
  }

  // --- Click Handling ---

  handleSquareClick(square: string) {
    if (!this.isInteractive()) return;

    const game = this.chess();
    const turn = game.turn();
    const allowed = this.allowedColor();
    
    if (allowed !== 'both' && allowed !== turn) return;

    const piece = game.get(square as any);
    const selected = this.selectedSquare();

    if (selected) {
        if (selected === square) {
            this.deselect();
            return;
        }

        if (this.attemptMove(selected, square)) {
            return;
        }

        if (piece && piece.color === turn) {
            this.selectSquare(square, game);
        } else {
            this.deselect();
        }
    } else {
        if (piece && piece.color === turn) {
            this.selectSquare(square, game);
        }
    }
  }

  // --- Drag and Drop Handling ---

  handleDragStart(e: DragEvent, square: string) {
      const game = this.chess();
      const turn = game.turn();
      const allowed = this.allowedColor();

      if (!this.isInteractive() || (allowed !== 'both' && allowed !== turn)) {
          e.preventDefault();
          return;
      }
      
      const piece = game.get(square as any);
      if (!piece || piece.color !== turn) {
          e.preventDefault();
          return;
      }

      if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', square);
          e.dataTransfer.effectAllowed = 'move';
      }

      this.draggingSquare.set(square);
      this.selectSquare(square, game);
  }

  handleDragOver(e: DragEvent) {
      e.preventDefault(); 
      if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
      }
  }

  handleDrop(e: DragEvent, targetSquare: string) {
      e.preventDefault();
      const fromSquare = e.dataTransfer?.getData('text/plain');
      
      if (fromSquare && fromSquare !== targetSquare) {
          this.attemptMove(fromSquare, targetSquare);
      }
      
      this.handleDragEnd();
  }

  handleDragEnd() {
      this.draggingSquare.set(null);
      this.deselect();
  }

  // --- Logic Helpers ---

  private selectSquare(square: string, game: Chess) {
      this.selectedSquare.set(square);
      const moves = game.moves({ square: square as any, verbose: true });
      this.legalMoves.set(moves.map(m => m.to));
  }

  private deselect() {
      this.selectedSquare.set(null);
      this.legalMoves.set([]);
  }

  private attemptMove(from: string, to: string): boolean {
      const game = this.chess();
      try {
          const moves = game.moves({ square: from as any, verbose: true });
          const move = moves.find(m => m.to === to);
          
          if (move) {
              this.move.emit({ from, to });
              this.deselect();
              return true;
          }
      } catch (e) { }
      return false;
  }

  isLegalMove(square: string): boolean {
      return this.legalMoves().includes(square);
  }

  isKingInCheck(piece: any): boolean {
    if (!piece) return false;
    return piece.type === 'k' && piece.color === this.chess().turn() && this.chess().inCheck();
  }
}
