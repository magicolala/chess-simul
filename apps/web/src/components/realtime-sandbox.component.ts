import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PresenceUser } from '../models/realtime.model';
import { RealtimeGameService } from '../services/realtime-game.service';
import { RealtimeSimulService } from '../services/realtime-simul.service';
import { SupabaseClientService } from '../services/supabase-client.service';

@Component({
  selector: 'app-realtime-sandbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ui-card space-y-4 p-4">
      <header class="flex items-center justify-between">
        <div>
          <p class="ui-label text-emerald-600">Supabase Realtime</p>
          <h3 class="text-lg font-black">Abonnements live</h3>
        </div>
        <span class="ui-chip text-gray-500">Flux demo</span>
      </header>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="space-y-3">
          <label class="ui-label">Game ID</label>
          <div class="flex space-x-2">
            <input
              [(ngModel)]="gameId"
              type="text"
              class="ui-input text-sm"
              placeholder="uuid game"
            />
            <button (click)="connectGame()" class="ui-btn ui-btn-secondary px-3 py-2 text-sm">
              Subscribe
            </button>
            <button (click)="disconnectGame()" class="ui-btn ui-btn-ghost px-3 py-2 text-sm">
              Stop
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <label class="ui-label">Simul ID (lobby)</label>
          <div class="flex space-x-2">
            <input
              [(ngModel)]="simulId"
              type="text"
              class="ui-input text-sm"
              placeholder="uuid simul"
            />
            <button (click)="connectSimul()" class="ui-btn ui-btn-primary px-3 py-2 text-sm">
              Subscribe
            </button>
            <button (click)="disconnectSimul()" class="ui-btn ui-btn-ghost px-3 py-2 text-sm">
              Stop
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <label class="ui-label">Envoyer un coup (Edge Function)</label>
          <div class="flex space-x-2">
            <input
              [(ngModel)]="uciMove"
              type="text"
              class="ui-input text-sm"
              placeholder="ex: e2e4"
            />
            <button
              (click)="submitMove()"
              [disabled]="submitting"
              class="ui-btn ui-btn-dark px-3 py-2 text-sm"
            >
              {{ submitting ? 'Envoi...' : 'Jouer' }}
            </button>
          </div>
          <p *ngIf="submitError" class="text-xs font-semibold text-red-600">{{ submitError }}</p>
          <pre
            *ngIf="moveResponse"
            class="max-h-32 overflow-auto border-2 border-[#1D1C1C] bg-white p-3 text-[11px] leading-tight"
            >{{ moveResponse | json }}</pre
          >
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="ui-card p-3 bg-gray-50">
          <h4 class="ui-label mb-2">Game state (UPDATE)</h4>
          <pre
            class="max-h-48 overflow-auto border-2 border-[#1D1C1C] bg-white p-3 text-[11px] leading-tight"
            >{{ game() | json }}</pre
          >
        </div>
        <div class="ui-card p-3 bg-gray-50 space-y-2">
          <h4 class="ui-label mb-2">Moves stream (INSERT)</h4>
          <div class="flex items-center justify-between text-[10px] text-gray-600">
            <button
              (click)="loadMoreMoves()"
              class="ui-btn ui-btn-ghost px-2 py-1 text-[10px]"
              [disabled]="loadingMoves() || !hasMoreMoves()"
            >
              Charger plus d'historique
            </button>
            <span *ngIf="loadingMoves()" class="animate-pulse">Chargement...</span>
            <span *ngIf="!hasMoreMoves()" class="text-emerald-600"
              >Tous les coups chargés</span
            >
          </div>
          <div
            class="space-y-1 overflow-auto border-2 border-[#1D1C1C] bg-white p-3 text-[11px] leading-tight max-h-48"
          >
            <div
              *ngFor="let move of moves(); trackBy: trackById"
              class="flex items-center justify-between"
            >
              <span class="font-mono"
                >{{ move.ply ? '#' + move.ply + ' ' : '' }}{{ move.san || move.uci }}</span
              >
              <span class="text-[10px] text-gray-500">{{ move.created_at || 'now' }}</span>
            </div>
            <p *ngIf="moves().length === 0" class="text-[11px] text-gray-500">
              En attente d'un coup...
            </p>
          </div>
        </div>
        <div class="ui-card p-3 bg-gray-50">
          <h4 class="ui-label mb-2">Présence (game:{{ gameId || '...' }})</h4>
          <div
            class="space-y-1 overflow-auto border-2 border-[#1D1C1C] bg-white p-3 text-[11px] leading-tight max-h-48"
          >
            <div
              *ngFor="let player of onlinePlayers()"
              class="flex items-center justify-between"
            >
              <span class="font-semibold">{{ player.username || player.user_id }}</span>
              <span class="text-[10px] text-emerald-600">online</span>
            </div>
            <p *ngIf="onlinePlayers().length === 0" class="text-[11px] text-gray-500">
              Personne en ligne.
            </p>
          </div>
        </div>
      </div>

      <div class="ui-card p-3 bg-gray-50">
        <h4 class="ui-label mb-2">Simul tables (UPDATE simul_tables)</h4>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div
            *ngFor="let table of simulTables$ | async"
            class="ui-card p-3 text-[11px] leading-tight"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold">Seat {{ table.seat_no ?? '??' }}</span>
              <span class="ui-chip text-[10px] text-gray-600 bg-gray-100">{{
                table.status || '...'
              }}</span>
            </div>
            <p class="mt-1 text-[10px] text-gray-600">Guest: {{ table.guest_id || '---' }}</p>
            <p class="text-[10px] text-gray-600">Game: {{ table.game_id || '---' }}</p>
          </div>
          <p *ngIf="(simulTables$ | async)?.length === 0" class="text-[11px] text-gray-500">
            Aucun update reçu pour le lobby.
          </p>
        </div>
      </div>

      <div class="ui-card p-3 bg-gray-50">
        <h4 class="ui-label mb-2">Présence (simul:{{ simulId || '...' }})</h4>
        <div
          class="space-y-1 overflow-auto border-2 border-[#1D1C1C] bg-white p-3 text-[11px] leading-tight max-h-48"
        >
          <div
            *ngFor="let player of simulPresence$ | async"
            class="flex items-center justify-between"
          >
            <span class="font-semibold">{{ player.username || player.user_id }}</span>
            <span class="text-[10px] text-emerald-600">online</span>
          </div>
          <p *ngIf="(simulPresence$ | async)?.length === 0" class="text-[11px] text-gray-500">
            Personne dans le lobby.
          </p>
        </div>
      </div>
    </section>
  `
})
export class RealtimeSandboxComponent implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService);
  private readonly realtime = inject(RealtimeGameService);
  private readonly simulRealtime = inject(RealtimeSimulService);
  private userSub: Subscription;

  gameId = '';
  simulId = '';
  uciMove = '';
  submitting = false;
  submitError: string | null = null;
  moveResponse: unknown = null;
  user: PresenceUser = { user_id: 'anon', username: 'invite' };

  game = this.realtime.game;
  moves = this.realtime.moves;
  onlinePlayers = this.realtime.onlinePlayers;
  loadingMoves = this.realtime.loadingMoves;
  hasMoreMoves = this.realtime.hasMoreMoves;

  simulTables$ = this.simulRealtime.tables$;
  simulPresence$ = this.simulRealtime.presence$;

  constructor() {
    this.userSub = this.supabase.user$.subscribe((u) => {
      if (u) {
        this.user = {
          user_id: u.id,
          username: (u.user_metadata as any)?.username || u.email || 'user'
        };
      } else {
        this.user = { user_id: 'anon', username: 'invite' };
      }
    });
  }

  connectGame() {
    this.realtime.subscribe(this.gameId.trim(), this.user);
  }

  connectSimul() {
    this.simulRealtime.subscribe(this.simulId.trim(), this.user);
  }

  loadMoreMoves() {
    void this.realtime.loadNextMovesPage();
  }

  disconnectGame() {
    void this.realtime.teardown();
  }

  disconnectSimul() {
    void this.simulRealtime.teardown();
  }

  async submitMove() {
    this.submitError = null;
    this.moveResponse = null;

    const trimmedGame = this.gameId.trim();
    const trimmedUci = this.uciMove.trim();

    if (!trimmedGame || !trimmedUci) {
      this.submitError = 'Game ID et UCI sont requis';
      return;
    }

    try {
      this.submitting = true;
      const result = await this.realtime.submitMove(trimmedGame, trimmedUci);
      this.moveResponse = result;
      this.uciMove = '';
    } catch (err) {
      this.submitError = (err as { message?: string })?.message ?? "Impossible d'envoyer le coup";
    } finally {
      this.submitting = false;
    }
  }

  trackById(_index: number, item: { id?: string }) {
    return item.id ?? _index;
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
    void this.realtime.teardown();
    void this.simulRealtime.teardown();
  }
}
