import { CommonModule } from '@angular/common';
import { Component, type OnDestroy, type OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoundRobinLobbyComponent } from '../components/round-robin-lobby.component';
import { RoundRobinGamesComponent } from '../components/round-robin-games.component';
import { type RoundRobinSimulService } from '../services/round-robin-simul.service';
import { type RoundRobinRealtimeService } from '../services/round-robin-realtime.service';
import { Subscription } from 'rxjs';
import { type SupabaseClientService } from '../services/supabase-client.service';

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
          <div class="flex flex-col items-start gap-2">
            <button
              class="ui-btn ui-btn-dark px-6 py-3"
              [disabled]="!canCreateSession() || loading()"
              (click)="createSession()"
            >
              {{ loading() ? 'Création...' : 'Créer une session' }}
            </button>
            @if (!canCreateSession()) {
              <p class="text-xs text-gray-500">
                La création nécessite un compte (mode classé uniquement).
              </p>
            }
          </div>
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
            <input
              class="ui-input"
              placeholder="Code d'invitation"
              [(ngModel)]="manualInviteCode"
            />
            <button class="ui-btn ui-btn-ghost md:col-span-2" (click)="manualJoin()">
              Rejoindre via code
            </button>
          </div>
          <label class="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" [(ngModel)]="guestMode" />
            Mode non classé (invité)
          </label>
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

  manualInviteCode = '';
  guestMode = false;
  private subscriptions = new Subscription();
  private activeSessionId: string | null = null;
  private inviteAutoGuest = false;

  constructor(
    private simulService: RoundRobinSimulService,
    private realtimeService: RoundRobinRealtimeService,
    private supabaseClient: SupabaseClientService
  ) {}

  currentUser = this.supabaseClient.currentUserSignal;
  isAnonymous = computed(() => this.supabaseClient.isAnonymousUser(this.currentUser()));
  canCreateSession = computed(() => Boolean(this.currentUser()) && !this.isAnonymous());

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('rr_session');
    const inviteCode = params.get('invite');
    const inviteParam = params.get('rr_invite');

    if (inviteParam) {
      this.guestMode = true;
      this.inviteAutoGuest = true;
      void this.handleInvite(inviteParam);
      return;
    }

    if (sessionId) {
      if (inviteCode) {
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
      } else {
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
  }

  async createSession() {
    if (!this.canCreateSession()) {
      this.simulService.error.set('Connexion requise pour créer une session.');
      return;
    }
    const session = await this.simulService.createSession();
    if (session) {
      this.manualInviteCode = session.inviteCode ?? '';
      this.setupRealtime(session.id);
    }
  }

  async manualJoin() {
    if (!this.manualInviteCode) {
      this.simulService.error.set('Renseignez le code.');
      return;
    }

    await this.handleInvite(this.manualInviteCode.trim());
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
        if (!existing) {
          return;
        }
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

  private async handleInvite(inviteCode: string) {
    if (!this.currentUser()) {
      if (!this.guestMode && !this.inviteAutoGuest) {
        this.simulService.error.set('Connectez-vous ou activez le mode non classé.');
        return;
      }
      try {
        await this.supabaseClient.ensureAnonymousSession();
      } catch {
        this.simulService.error.set('Impossible d’ouvrir une session invité.');
        return;
      }
    }

    const resolved = await this.simulService.fetchSessionByInvite(inviteCode);
    if (!resolved) {
      return;
    }

    if (resolved.status === 'draft') {
      const joined = await this.simulService.joinSession(resolved.id, inviteCode);
      if (joined) {
        this.setupRealtime(joined.id);
      }
      return;
    }

    this.simulService.session.set(resolved);
    this.setupRealtime(resolved.id);
    if (resolved.status === 'started') {
      const games = await this.simulService.fetchGames(resolved.id);
      this.setupGameRealtime(games);
    }
  }
}
