import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoundRobinLobbyComponent } from '../components/round-robin-lobby.component';
import { RoundRobinGamesComponent } from '../components/round-robin-games.component';
import { RoundRobinSimulService } from '../services/round-robin-simul.service';
import { RoundRobinRealtimeService } from '../services/round-robin-realtime.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-round-robin-simul-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RoundRobinLobbyComponent, RoundRobinGamesComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black font-display">Simultanée Round Robin</h1>
          <p class="text-sm text-gray-600">
            Créez une session privée et lancez un tournoi où chacun affronte tout le monde.
          </p>
        </div>
        @if (!session()) {
          <button class="ui-btn ui-btn-dark px-6 py-3" (click)="createSession()">
            {{ loading() ? 'Création...' : 'Créer une session' }}
          </button>
        }
      </div>

      @if (session()) {
        <app-round-robin-lobby></app-round-robin-lobby>

        @if (session()?.status === 'started') {
          <app-round-robin-games></app-round-robin-games>
        }
      } @else {
        <div class="ui-card p-6 space-y-4">
          <p class="text-sm font-bold uppercase text-gray-500">Rejoindre une session</p>
          <div class="grid gap-3 md:grid-cols-[1fr_auto]">
            <input class="ui-input" placeholder="ID de session" [(ngModel)]="manualSessionId" />
            <input
              class="ui-input"
              placeholder="Code d'invitation"
              [(ngModel)]="manualInviteCode"
            />
            <button class="ui-btn ui-btn-ghost md:col-span-2" (click)="manualJoin()">
              Rejoindre via lien
            </button>
          </div>
        </div>
      }

      @if (error()) {
        <p class="text-red-600 text-sm font-bold">{{ error() }}</p>
      }
    </div>
  `
})
export class RoundRobinSimulPageComponent implements OnInit, OnDestroy {
  session = this.simulService.session;
  loading = this.simulService.loading;
  error = this.simulService.error;

  manualSessionId = '';
  manualInviteCode = '';
  private subscriptions = new Subscription();
  private activeSessionId: string | null = null;

  constructor(
    private simulService: RoundRobinSimulService,
    private realtimeService: RoundRobinRealtimeService
  ) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('rr_session');
    const inviteCode = params.get('invite');

    if (sessionId && inviteCode) {
      void this.simulService.joinSession(sessionId, inviteCode).then((session) => {
        if (session) {
          this.setupRealtime(session.id);
          if (session.status === 'started') {
            void this.simulService.fetchGames(session.id).then((games) => {
              this.setupGameRealtime(games);
            });
          }
        }
      });
      return;
    }

    if (sessionId) {
      void this.simulService.fetchSession(sessionId).then((session) => {
        if (session) {
          this.setupRealtime(session.id);
          if (session.status === 'started') {
            void this.simulService.fetchGames(session.id).then((games) => {
              this.setupGameRealtime(games);
            });
          }
        }
      });
    }
  }

  async createSession() {
    const session = await this.simulService.createSession();
    if (session) {
      this.manualSessionId = session.id;
      this.setupRealtime(session.id);
    }
  }

  async manualJoin() {
    if (!this.manualSessionId || !this.manualInviteCode) {
      this.simulService.error.set('Renseignez le lien complet.');
      return;
    }

    const session = await this.simulService.joinSession(
      this.manualSessionId.trim(),
      this.manualInviteCode.trim()
    );

    if (session) {
      this.setupRealtime(session.id);
      if (session.status === 'started') {
        const games = await this.simulService.fetchGames(this.manualSessionId.trim());
        this.setupGameRealtime(games);
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    void this.realtimeService.unsubscribeRoster();
    void this.realtimeService.unsubscribeGames();
  }

  private setupRealtime(sessionId: string) {
    if (this.activeSessionId === sessionId) {
      return;
    }
    this.activeSessionId = sessionId;
    const current = this.session();
    if (current) {
      this.realtimeService.seedRoster(current.participants ?? []);
    }
    this.realtimeService.subscribeRoster(sessionId);

    this.subscriptions.add(
      this.realtimeService.roster$.subscribe((roster) => {
        const existing = this.session();
        if (!existing) return;
        this.simulService.session.set({ ...existing, participants: roster });
      })
    );
  }

  private subscribeGameStatus() {
    this.subscriptions.add(
      this.realtimeService.gameStatus$.subscribe((statusMap) => {
        const updated = this.simulService.games().map((game) => ({
          ...game,
          status: statusMap[game.gameId] ?? game.status
        }));
        this.simulService.games.set(updated);
      })
    );
  }

  private setupGameRealtime(games: { gameId?: string; id: string }[]) {
    const gameIds = games.map((game) => game.gameId ?? game.id).filter(Boolean) as string[];
    this.realtimeService.seedGameStatus(games as any);
    this.realtimeService.subscribeGames(gameIds);
    this.subscribeGameStatus();
  }
}
