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
    <section class="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <header class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase text-emerald-600">Supabase Realtime</p>
          <h3 class="text-lg font-bold">Abonnements live</h3>
        </div>
        <span class="text-[10px] font-semibold uppercase text-slate-500">Flux demo</span>
      </header>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-slate-700">Game ID</label>
          <div class="flex space-x-2">
            <input [(ngModel)]="gameId" type="text" class="flex-1 rounded border px-3 py-2 text-sm" placeholder="uuid game" />
            <button (click)="connectGame()" class="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Subscribe</button>
            <button (click)="disconnectGame()" class="rounded border px-3 py-2 text-sm font-semibold text-slate-700">Stop</button>
          </div>
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-semibold text-slate-700">Simul ID (lobby)</label>
          <div class="flex space-x-2">
            <input [(ngModel)]="simulId" type="text" class="flex-1 rounded border px-3 py-2 text-sm" placeholder="uuid simul" />
            <button (click)="connectSimul()" class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Subscribe</button>
            <button (click)="disconnectSimul()" class="rounded border px-3 py-2 text-sm font-semibold text-slate-700">Stop</button>
          </div>
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-semibold text-slate-700">Envoyer un coup (Edge Function)</label>
          <div class="flex space-x-2">
            <input [(ngModel)]="uciMove" type="text" class="flex-1 rounded border px-3 py-2 text-sm" placeholder="ex: e2e4" />
            <button
              (click)="submitMove()"
              [disabled]="submitting"
              class="rounded bg-purple-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {{ submitting ? 'Envoi...' : 'Jouer' }}
            </button>
          </div>
          <p *ngIf="submitError" class="text-xs font-semibold text-red-600">{{ submitError }}</p>
          <pre *ngIf="moveResponse" class="max-h-32 overflow-auto rounded border bg-white p-3 text-[11px] leading-tight">{{ moveResponse | json }}</pre>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-lg border bg-slate-50 p-3">
          <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Game state (UPDATE)</h4>
          <pre class="max-h-48 overflow-auto rounded bg-white p-3 text-[11px] leading-tight">{{ game$ | async | json }}</pre>
        </div>
        <div class="rounded-lg border bg-slate-50 p-3 space-y-2">
          <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Moves stream (INSERT)</h4>
          <div class="flex items-center justify-between text-[10px] text-slate-600">
            <button
              (click)="loadMoreMoves()"
              class="rounded border px-2 py-1 font-semibold hover:bg-slate-100"
              [disabled]="(loadingMoves$ | async) || !(hasMoreMoves$ | async)"
            >
              Charger plus d'historique
            </button>
            <span *ngIf="loadingMoves$ | async" class="animate-pulse">Chargement...</span>
            <span *ngIf="!(hasMoreMoves$ | async)" class="text-emerald-600">Tous les coups chargés</span>
          </div>
          <div class="space-y-1 overflow-auto rounded bg-white p-3 text-[11px] leading-tight max-h-48">
            <div *ngFor="let move of moves$ | async; trackBy: trackById" class="flex items-center justify-between">
              <span class="font-mono">{{ move.ply ? '#' + move.ply + ' ' : '' }}{{ move.san || move.uci }}</span>
              <span class="text-[10px] text-slate-500">{{ move.created_at || 'now' }}</span>
            </div>
            <p *ngIf="(moves$ | async)?.length === 0" class="text-[11px] text-slate-500">En attente d'un coup...</p>
          </div>
        </div>
        <div class="rounded-lg border bg-slate-50 p-3">
          <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Présence (game:{{ gameId || '...' }})</h4>
          <div class="space-y-1 overflow-auto rounded bg-white p-3 text-[11px] leading-tight max-h-48">
            <div *ngFor="let player of onlinePlayers$ | async" class="flex items-center justify-between">
              <span class="font-semibold">{{ player.username || player.user_id }}</span>
              <span class="text-[10px] text-emerald-600">online</span>
            </div>
            <p *ngIf="(onlinePlayers$ | async)?.length === 0" class="text-[11px] text-slate-500">Personne en ligne.</p>
          </div>
        </div>
      </div>

      <div class="rounded-lg border bg-slate-50 p-3">
        <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Simul tables (UPDATE simul_tables)</h4>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div *ngFor="let table of simulTables$ | async" class="rounded border bg-white p-3 text-[11px] leading-tight">
            <div class="flex items-center justify-between">
              <span class="font-semibold">Seat {{ table.seat_no ?? '??' }}</span>
              <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{{ table.status || '...' }}</span>
            </div>
            <p class="mt-1 text-[10px] text-slate-600">Guest: {{ table.guest_id || '---' }}</p>
            <p class="text-[10px] text-slate-600">Game: {{ table.game_id || '---' }}</p>
          </div>
          <p *ngIf="(simulTables$ | async)?.length === 0" class="text-[11px] text-slate-500">Aucun update reçu pour le lobby.</p>
        </div>
      </div>

      <div class="rounded-lg border bg-slate-50 p-3">
        <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Présence (simul:{{ simulId || '...' }})</h4>
        <div class="space-y-1 overflow-auto rounded bg-white p-3 text-[11px] leading-tight max-h-48">
          <div *ngFor="let player of simulPresence$ | async" class="flex items-center justify-between">
            <span class="font-semibold">{{ player.username || player.user_id }}</span>
            <span class="text-[10px] text-emerald-600">online</span>
          </div>
          <p *ngIf="(simulPresence$ | async)?.length === 0" class="text-[11px] text-slate-500">Personne dans le lobby.</p>
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

  game$ = this.realtime.game$;
  moves$ = this.realtime.moves$;
  onlinePlayers$ = this.realtime.onlinePlayers$;
  loadingMoves$ = this.realtime.loadingMoves$;
  hasMoreMoves$ = this.realtime.hasMoreMoves$;

  simulTables$ = this.simulRealtime.tables$;
  simulPresence$ = this.simulRealtime.presence$;

  constructor() {
    this.userSub = this.supabase.user$.subscribe((u) => {
      if (u) {
        this.user = { user_id: u.id, username: (u.user_metadata as any)?.username || u.email || 'user' };
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
      this.moveResponse = result?.data ?? result;
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
