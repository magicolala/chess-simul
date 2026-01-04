import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RoundRobinSimulService } from '../services/round-robin-simul.service';
import { SupabaseClientService } from '../services/supabase-client.service';

@Component({
  selector: 'app-round-robin-lobby',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-card p-6 space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="ui-label">Simultanée Round Robin</p>
          <h2 class="text-2xl font-black font-display">Session privée</h2>
          <p class="text-sm text-gray-500">
            Statut : <span class="font-bold">{{ session()?.status }}</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs uppercase tracking-widest text-gray-400">Organisateur</p>
          <p class="font-bold">
            {{ isOrganizer() ? 'Vous' : session()?.organizerId?.slice(0, 6) }}
          </p>
        </div>
      </div>

      @if (inviteLink()) {
        <div class="ui-card p-4 bg-white/80">
          <p class="text-xs font-bold uppercase text-gray-500">Lien d'invitation</p>
          <div class="flex flex-col md:flex-row md:items-center gap-3 mt-2">
            <span class="text-xs font-mono break-all">{{ inviteLink() }}</span>
            <button class="ui-btn ui-btn-ghost text-sm" (click)="copyInvite()">Copier</button>
            @if (copied()) {
              <span class="text-xs font-bold text-emerald-600">Copié !</span>
            }
          </div>
        </div>
      }

      <div class="space-y-2">
        <p class="text-sm font-bold uppercase text-gray-500">Participants</p>
        @if (session()?.participants?.length) {
          <ul class="space-y-2">
            @for (participant of session()!.participants; track participant.id) {
              <li class="flex items-center justify-between bg-white/70 p-2 border">
                <span class="text-sm font-bold">
                  {{ participant.userId === currentUserId() ? 'Vous' : participant.userId }}
                </span>
                <span class="text-xs uppercase tracking-widest text-gray-500">
                  {{ participant.status }}
                </span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-sm text-gray-500">En attente de participants...</p>
        }
      </div>

      @if (error()) {
        <p class="text-red-600 text-sm font-bold">{{ error() }}</p>
      }

      @if (isOrganizer()) {
        <div class="flex flex-col gap-2">
          <button
            class="ui-btn ui-btn-dark px-6 py-3"
            [disabled]="session()?.status !== 'draft' || participantCount() < 2 || loading()"
            (click)="startSession()"
          >
            {{ loading() ? 'Démarrage...' : 'Lancer les parties' }}
          </button>
          <button
            class="ui-btn ui-btn-ghost px-6 py-3"
            [disabled]="session()?.status !== 'draft' || loading()"
            (click)="deleteSession()"
          >
            Supprimer la session
          </button>
        </div>
      }
    </div>
  `
})
export class RoundRobinLobbyComponent {
  private supabase = this.supabaseClient;

  session = this.simulService.session;
  inviteLink = this.simulService.inviteLink;
  loading = this.simulService.loading;
  error = this.simulService.error;

  copied = signal(false);

  currentUserId = computed(() => this.supabase.currentUser()?.id ?? null);
  participantCount = computed(() => this.session()?.participants?.length ?? 0);
  isOrganizer = computed(() => this.session()?.organizerId === this.currentUserId());

  constructor(
    private simulService: RoundRobinSimulService,
    private supabaseClient: SupabaseClientService
  ) {}

  async copyInvite() {
    if (!this.inviteLink()) return;
    try {
      await navigator.clipboard.writeText(this.inviteLink()!);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }

  async startSession() {
    const session = this.session();
    if (!session) return;
    await this.simulService.startSession(session.id);
  }

  async deleteSession() {
    const session = this.session();
    if (!session) return;
    if (!confirm('Supprimer cette session ?')) return;
    await this.simulService.deleteSession(session.id);
  }
}
