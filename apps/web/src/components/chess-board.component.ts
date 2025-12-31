import {
  Component,
  input,
  output,
  computed,
  signal,
  effect,
  ChangeDetectionStrategy,
  untracked,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative w-full aspect-square select-none rounded-[2px] overflow-hidden border-2 border-[#1D1C1C]"
    >
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
            @let isPremoveSquare =
              pendingPremove()?.from === squareId || pendingPremove()?.to === squareId;

            <!-- Logic for interaction -->
            @let canInteract =
              isInteractive() &&
              (allowedColor() === 'both'
                ? piece?.color === chess().turn()
                : piece?.color === allowedColor());

            @let isLegal = isLegalMove(squareId);

            <div
              (click)="handleSquareClick(squareId)"
              (dragover)="handleDragOver($event)"
              (drop)="handleDrop($event, squareId)"
              class="relative w-full h-full flex items-center justify-center"
              [class.cursor-pointer]="canInteract || isLegal"
              [class.transition-colors]="isFocused()"
              [class.duration-75]="isFocused()"
              [style.backgroundColor]="
                getSquareColor(
                  isLight,
                  isLastMove,
                  isSelected,
                  isBestMoveSource,
                  isBestMoveDest,
                  isPremoveSquare
                )
              "
            >
              <!-- Rank/File Labels -->
              @if (
                (file === 'a' && orientation() === 'w') || (file === 'h' && orientation() === 'b')
              ) {
                <span
                  class="absolute top-0.5 left-1 text-[10px] font-bold z-0"
                  [style.color]="isLight ? prefs.currentTheme.dark : prefs.currentTheme.light"
                >
                  {{ rank }}
                </span>
              }

              @if ((rank === 1 && orientation() === 'w') || (rank === 8 && orientation() === 'b')) {
                <span
                  class="absolute bottom-0 right-1 text-[10px] font-bold z-0"
                  [style.color]="isLight ? prefs.currentTheme.dark : prefs.currentTheme.light"
                >
                  {{ file }}
                </span>
              }

              <!-- Move Hint Dot (Legal Move) -->
              @if (isLegal) {
                <div
                  class="absolute w-4 h-4 rounded-full z-10 pointer-events-none opacity-50"
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
                  class="w-[85%] h-[85%] z-20 select-none"
                  [class.transition-transform]="isFocused()"
                  [class.duration-200]="isFocused()"
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
  lastMove = input<{ from: string; to: string } | null>(null);
  bestMove = input<string | null>(null); // e.g. "e2e4"
  isInteractive = input<boolean>(false);
  orientation = input<'w' | 'b'>('w');
  allowedColor = input<'w' | 'b' | 'both'>('w');
  isFocused = input<boolean>(false);
  allowPremoves = input<boolean>(false);

  move = output<{ from: string; to: string }>();

  private baseRanks = [8, 7, 6, 5, 4, 3, 2, 1];
  private baseFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // Computed arrays for rendering based on orientation
  currentRanks = computed(() =>
    this.orientation() === 'w' ? this.baseRanks : [...this.baseRanks].reverse()
  );
  currentFiles = computed(() =>
    this.orientation() === 'w' ? this.baseFiles : [...this.baseFiles].reverse()
  );

  // Reactive Chess Instance
  public chess = computed(() => {
    const c = new Chess();
    try {
      c.load(this.fen());
    } catch {
      // Silent catch
    }
    return c;
  });

  selectedSquare = signal<string | null>(null);
  draggingSquare = signal<string | null>(null);
  legalMoves = signal<string[]>([]);
  pendingPremove = signal<{ from: string; to: string } | null>(null);

  constructor() {
    effect(() => {
      this.fen();
      untracked(() => {
        this.selectedSquare.set(null);
        this.draggingSquare.set(null);
        this.legalMoves.set([]);
      });
    });

    effect(() => {
      const interactive = this.isInteractive();
      const pending = this.pendingPremove();
      this.fen();

      if (interactive && pending) {
        if (this.isMoveLegalNow(pending.from, pending.to)) {
          this.pendingPremove.set(null);
          this.move.emit(pending);
        } else {
          this.pendingPremove.set(null);
        }
      }
    });
  }

  isSquareLight(file: string, rank: number): boolean {
    const fileIdx = this.baseFiles.indexOf(file);
    const rankIdx = rank - 1;
    return (fileIdx + rankIdx) % 2 !== 0;
  }

  getSquareColor(
    isLight: boolean,
    isLastMove: boolean,
    isSelected: boolean,
    isBestFrom: boolean,
    isBestTo: boolean,
    isPremove: boolean
  ): string {
    const theme = this.prefs.currentTheme;
    const CYAN = '#7AF7F7';
    const PREMOVE = '#fbbf24';

    if (isSelected) return CYAN;

    if (isPremove) return isLight ? PREMOVE : '#f59e0b';

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
    const game = this.chess();
    const allowed = this.allowedColor();
    const interactive = this.isInteractive();
    const premoveMode = !interactive && this.canUsePremoves();

    if (!interactive && !premoveMode) return;

    const piece = game.get(square as any);
    const selected = this.selectedSquare();
    const isPlayersPiece = piece && (allowed === 'both' ? true : piece.color === allowed);

    if (selected) {
      if (selected === square) {
        this.deselect();
        return;
      }

      if (this.attemptMove(selected, square, interactive)) {
        return;
      }

      if (isPlayersPiece) {
        this.selectSquare(square, premoveMode);
      } else {
        this.deselect();
      }
    } else {
      if (isPlayersPiece) {
        this.selectSquare(square, premoveMode);
      }
    }
  }

  // --- Drag and Drop Handling ---

  handleDragStart(e: DragEvent, square: string) {
    const game = this.chess();
    const allowed = this.allowedColor();
    const interactive = this.isInteractive();
    const piece = game.get(square as any);
    const isPlayersPiece = piece && (allowed === 'both' ? true : piece.color === allowed);

    if ((!interactive && !(this.canUsePremoves() && isPlayersPiece)) || !piece || !isPlayersPiece) {
      e.preventDefault();
      return;
    }

    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', square);
      e.dataTransfer.effectAllowed = 'move';
    }

    this.draggingSquare.set(square);
    this.selectSquare(square, !interactive);
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
      this.attemptMove(fromSquare, targetSquare, this.isInteractive());
    }

    this.handleDragEnd();
  }

  handleDragEnd() {
    this.draggingSquare.set(null);
    this.deselect();
  }

  // --- Logic Helpers ---

  private selectSquare(square: string, forPremove: boolean) {
    this.selectedSquare.set(square);
    const board = forPremove ? this.getPremoveBoard() : this.chess();
    const moves = board?.moves({ square: square as any, verbose: true }) || [];
    this.legalMoves.set(moves.map((m) => (m as any).to ?? m.to));
  }

  private deselect() {
    this.selectedSquare.set(null);
    this.legalMoves.set([]);
  }

  private attemptMove(from: string, to: string, isActiveTurn: boolean): boolean {
    const allowed = this.allowedColor();
    const game = this.chess();
    const isPlayerTurn = isActiveTurn && (allowed === 'both' || allowed === game.turn());

    try {
      if (isPlayerTurn) {
        const moves = game.moves({ square: from as any, verbose: true });
        const move = moves.find((m) => m.to === to);

        if (move) {
          this.move.emit({ from, to });
          this.pendingPremove.set(null);
          this.deselect();
          return true;
        }
      } else if (this.canUsePremoves() && this.isPremoveLegal(from, to)) {
        this.pendingPremove.set({ from, to });
        this.deselect();
        return true;
      }
    } catch (error) {
      console.error('Move validation failed', error);
    }
    return false;
  }

  private getPremoveBoard(): Chess | null {
    try {
      const fen = this.fen();
      const segments = fen.split(' ');
      if (segments.length < 2) return null;
      segments[1] = this.allowedColor() === 'both' ? this.chess().turn() : this.allowedColor();
      return new Chess(segments.join(' '));
    } catch (error) {
      console.error('Unable to prepare premove board', error);
      return null;
    }
  }

  private isPremoveLegal(from: string, to: string): boolean {
    const premoveBoard = this.getPremoveBoard();
    if (!premoveBoard) return false;
    const moves = premoveBoard.moves({ square: from as any, verbose: true });
    return moves.some((m) => m.to === to);
  }

  private isMoveLegalNow(from: string, to: string): boolean {
    try {
      const moves = this.chess().moves({ square: from as any, verbose: true });
      return moves.some((m) => m.to === to);
    } catch {
      return false;
    }
  }

  private canUsePremoves(): boolean {
    return this.allowPremoves() && this.allowedColor() !== 'both';
  }

  isLegalMove(square: string): boolean {
    return this.legalMoves().includes(square);
  }

  isKingInCheck(piece: any): boolean {
    if (!piece) return false;
    return piece.type === 'k' && piece.color === this.chess().turn() && this.chess().inCheck();
  }
}
