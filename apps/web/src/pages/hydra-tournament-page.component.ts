import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { HydraBoardMosaicComponent, HydraBoardSortMode } from '../components/hydra-board-mosaic.component';
import { HydraLeaderboardComponent } from '../components/hydra-leaderboard.component';
import { HydraMatchmakingService } from '../services/hydra-matchmaking.service';
import { HydraRealtimeService } from '../services/hydra-realtime.service';
import { HydraTournamentService } from '../services/hydra-tournament.service';
import { PreferencesService } from '../services/preferences.service';
import type { Database } from '@supabase/types/database.types';

type HydraParticipantRow = Database['public']['Tables']['hydra_tournament_participants']['Row'];

type LeaderboardEntry = {
  playerId: string;
  scoreTotal: number;
  rank: number;
  eliminatedAt?: string | null;
};

@Component({
  selector: 'app-hydra-tournament-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HydraBoardMosaicComponent, HydraLeaderboardComponent],
  template: `
    <section class="min-h-screen bg-slate-50">
      <header class="border-b bg-white px-6 py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">Hydra Tournament</p>
            <h1 class="text-2xl font-bold text-slate-900">Session {{ tournamentId }}</h1>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              (click)="joinTournament()"
            >
              Rejoindre
            </button>
            <button
              class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
              (click)="toggleQueue()"
            >
              {{ inQueue ? 'Quitter la file' : 'Entrer en file' }}
            </button>
            <a routerLink="/settings" class="text-sm text-slate-500 underline">Paramètres</a>
          </div>
        </div>
      </header>

      <div class="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[2fr_1fr]">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div class="flex items-center gap-3 text-sm">
              <label class="font-semibold text-slate-700">Tri</label>
              <select
                class="rounded-md border border-slate-200 px-2 py-1 text-sm"
                [value]="sortMode"
                (change)="setSortMode($any($event.target).value)"
              >
                <option value="start">Ordre d'ouverture</option>
                <option value="recent">Activité récente</option>
                <option value="time">Temps restant</option>
              </select>
            </div>
            <label class="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" [checked]="soundEnabled" (change)="toggleSound($event)" />
              Son d'alerte
            </label>
          </div>

          <app-hydra-board-mosaic
            [games]="(games$ | async) ?? []"
            [sortMode]="sortMode"
            [highlightedGameId]="highlightedGameId$ | async"
          ></app-hydra-board-mosaic>
        </div>

        <div class="space-y-4">
          <app-hydra-leaderboard [entries]="(leaderboard$ | async) ?? []"></app-hydra-leaderboard>
          <section class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <h3 class="mb-2 font-semibold text-slate-700">Statut file d'attente</h3>
            <p>Fenêtre Elo: {{ queueStatus }}</p>
          </section>
        </div>
      </div>
    </section>
  `
})
export class HydraTournamentPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly hydraService = inject(HydraTournamentService);
  private readonly hydraRealtime = inject(HydraRealtimeService);
  private readonly matchmaking = inject(HydraMatchmakingService);
  private readonly preferences = inject(PreferencesService);
  private readonly destroy$ = new Subject<void>();

  tournamentId = '';
  sortMode: HydraBoardSortMode = 'start';
  soundEnabled = this.preferences.gameSettings().soundEnabled;
  inQueue = false;
  queueStatus = '—';

  games$ = this.hydraRealtime.games$;
  highlightedGameId$ = this.games$.pipe(
    map((games) => {
      const sorted = [...games].sort((a, b) => {
        const aTime = a.last_move_at ? new Date(a.last_move_at).getTime() : 0;
        const bTime = b.last_move_at ? new Date(b.last_move_at).getTime() : 0;
        return bTime - aTime;
      });
      return sorted[0]?.id ?? null;
    }),
    distinctUntilChanged()
  );

  leaderboard$ = this.hydraRealtime.participants$.pipe(
    map((participants) => this.toLeaderboard(participants))
  );

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.tournamentId) return;

    this.hydraRealtime.subscribe(this.tournamentId);
    void this.loadInitialGames();
    this.highlightedGameId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((gameId) => {
        if (!gameId || !this.soundEnabled) return;
        this.playAlertSound();
      });
  }

  async loadInitialGames() {
    const { data } = await this.hydraService.fetchActiveGames(this.tournamentId);
    if (data) {
      this.hydraRealtime.preloadGames(data);
    }
  }

  async joinTournament() {
    await this.hydraService.joinTournament(this.tournamentId);
  }

  async toggleQueue() {
    if (!this.inQueue) {
      const response = await this.matchmaking.joinQueue(this.tournamentId, 1500, 9);
      this.queueStatus = response.eloMin !== undefined ? `${response.eloMin} - ${response.eloMax}` : 'En file';
      this.inQueue = true;
      return;
    }

    await this.matchmaking.leaveQueue(this.tournamentId);
    this.queueStatus = '—';
    this.inQueue = false;
  }

  setSortMode(mode: HydraBoardSortMode) {
    this.sortMode = mode;
  }

  toggleSound(event: Event) {
    const input = event.target as HTMLInputElement;
    this.soundEnabled = input.checked;
    this.preferences.updateGameSettings({ soundEnabled: input.checked });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    void this.hydraRealtime.teardown();
  }

  private toLeaderboard(participants: HydraParticipantRow[]): LeaderboardEntry[] {
    const sorted = [...participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.eliminated_at && b.eliminated_at) {
        return new Date(a.eliminated_at).getTime() - new Date(b.eliminated_at).getTime();
      }
      if (a.eliminated_at) return 1;
      if (b.eliminated_at) return -1;
      return 0;
    });

    return sorted.map((participant, index) => ({
      playerId: participant.user_id,
      scoreTotal: participant.score,
      eliminatedAt: participant.eliminated_at,
      rank: index + 1,
    }));
  }

  private playAlertSound() {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.2;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
      oscillator.onended = () => audioContext.close();
    } catch (error) {
      console.warn('Alert sound unavailable', error);
    }
  }
}
