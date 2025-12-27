import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SupabaseClientService } from '../services/supabase-client.service';
import {
  PresenceUser,
  RealtimeGameService
} from '../services/realtime-game.service';

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

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-lg border bg-slate-50 p-3">
          <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Game state (UPDATE)</h4>
          <pre class="max-h-48 overflow-auto rounded bg-white p-3 text-[11px] leading-tight">{{ game$ | async | json }}</pre>
        </div>
        <div class="rounded-lg border bg-slate-50 p-3">
          <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Moves stream (INSERT)</h4>
          <div class="space-y-1 overflow-auto rounded bg-white p-3 text-[11px] leading-tight max-h-48">
            <div *ngFor="let move of moves$ | async; trackBy: trackById" class="flex items-center justify-between">
              <span class="font-mono">{{ move.san || move.uci }}</span>
              <span class="text-[10px] text-slate-500">{{ move.created_at || 'now' }}</span>
            </div>
            <p *ngIf="(moves$ | async)?.length === 0" class="text-[11px] text-slate-500">En attente d'un coup...</p>
          </div>
        </div>
        <div class="rounded-lg border bg-slate-50 p-3">
          <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Présence (game:${'{'}{ gameId || '...' }{'}'})</h4>
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
        <h4 class="mb-2 text-xs font-semibold uppercase text-slate-500">Simul tables (UPDATE games simul_id)</h4>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div *ngFor="let table of simulTables$ | async" class="rounded border bg-white p-3 text-[11px] leading-tight">
            <div class="flex items-center justify-between">
              <span class="font-semibold">Table {{ table.gameId }}</span>
              <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">live</span>
            </div>
            <pre class="mt-2 whitespace-pre-wrap">{{ table.data | json }}</pre>
          </div>
          <p *ngIf="(simulTables$ | async)?.length === 0" class="text-[11px] text-slate-500">Aucun update reçu pour le lobby.</p>
        </div>
      </div>
    </section>
  `
})
export class RealtimeSandboxComponent implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService);
  private readonly realtime = inject(RealtimeGameService);
  private userSub: Subscription;

  gameId = '';
  simulId = '';
  user: PresenceUser = { user_id: 'anon', username: 'invite' };

  game$ = this.realtime.game$;
  moves$ = this.realtime.moves$;
  onlinePlayers$ = this.realtime.onlinePlayers$;
  simulTables$ = this.realtime.simulTables$;

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
    this.realtime.subscribeToGame(this.gameId.trim(), this.user);
  }

  connectSimul() {
    this.realtime.subscribeToSimul(this.simulId.trim(), this.user);
  }

  disconnectGame() {
    void this.realtime.teardownGameChannel();
  }

  disconnectSimul() {
    void this.realtime.teardownSimulChannel();
  }

  trackById(_index: number, item: { id?: string }) {
    return item.id ?? _index;
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
    void this.realtime.teardownGameChannel();
    void this.realtime.teardownSimulChannel();
  }
}
