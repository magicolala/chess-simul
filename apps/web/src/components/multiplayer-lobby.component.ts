import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseMatchmakingService } from '../services/supabase-matchmaking.service';

@Component({
  selector: 'app-multiplayer-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto p-4 md:p-8 font-sans h-full space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2
            class="text-4xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter"
          >
            Multijoueur
          </h2>
          <p class="text-gray-500 font-bold">Trouve un adversaire ou invite un ami.</p>
        </div>
        <div class="ui-chip text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-[#1a1a1a]">
          Hors simul
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="ui-card p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold uppercase text-gray-500">Partie rapide</p>
              <h3 class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white">
                Quick Play
              </h3>
            </div>
            <span class="text-lg">⚡</span>
          </div>

          <label class="ui-label">Cadence</label>
          <select 
            [ngModel]="selectedTimeControl()" 
            (ngModelChange)="selectedTimeControl.set($event)"
            class="ui-input font-mono font-bold"
          >
            <option value="3+2">3+2 Blitz</option>
            <option value="5+0">5+0 Standard</option>
            <option value="10+0">10+0 Rapide</option>
          </select>

          <div class="flex items-center space-x-2">
            <button
              (click)="startQuickPlay()"
              class="ui-btn ui-btn-primary flex-1 py-3 font-black font-display"
              [disabled]="matchmaking.queueStatus() === 'searching'"
            >
              {{ matchmaking.queueStatus() === 'searching' ? 'Recherche...' : 'Jouer maintenant' }}
            </button>
            @if (matchmaking.queueStatus() === 'searching') {
              <button (click)="cancelQueue()" class="ui-btn ui-btn-ghost px-4 py-3 font-bold">
                Annuler
              </button>
            }
          </div>

          @if (matchmaking.activeGameId()) {
            <div
              class="p-3 bg-green-100 border-2 border-green-500 text-green-900 font-bold text-sm"
            >
              Partie créée : {{ matchmaking.activeGameId() }}
            </div>
          } @else {
            <p class="text-sm text-gray-500 font-bold">
              Deux joueurs dans la file créent automatiquement une partie.
            </p>
          }
        </section>

        <section class="ui-card p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold uppercase text-gray-500">Invitations</p>
              <h3 class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white">
                Invite a friend
              </h3>
            </div>
            <span class="text-lg">🤝</span>
          </div>

          <label class="ui-label">ID de l'ami</label>
          <input 
            [ngModel]="friendId()" 
            (ngModelChange)="friendId.set($event)"
            placeholder="uuid du joueur" 
            class="ui-input font-mono" 
          />

          <label class="ui-label">Cadence</label>
          <select 
            [ngModel]="inviteTimeControl()" 
            (ngModelChange)="inviteTimeControl.set($event)"
            class="ui-input font-mono font-bold"
          >
            <option value="5+0">5+0</option>
            <option value="10+0">10+0</option>
            <option value="3+2">3+2</option>
          </select>

          <button
            (click)="sendInvite()"
            class="ui-btn ui-btn-dark w-full py-3 font-black font-display"
          >
            Inviter
          </button>

          <div class="space-y-3">
            <p class="text-xs font-bold uppercase text-gray-500">Invitations reçues</p>
            @if (matchmaking.incomingInvites().length === 0) {
              <p class="text-gray-500 text-sm font-bold">Aucune invitation en attente.</p>
            } @else {
              <div class="space-y-2">
                @for (invite of matchmaking.incomingInvites(); track invite.id) {
                  <div
                    class="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-2"
                  >
                    <div>
                      <p class="font-bold text-sm">{{ invite.from_user }}</p>
                      <p class="text-xs text-gray-500">Cadence {{ invite.time_control }}</p>
                    </div>
                    <div class="space-x-2">
                      <button
                        (click)="accept(invite.id)"
                        class="px-3 py-1 bg-green-500 text-white text-xs font-black"
                      >
                        Accepter
                      </button>
                      <button
                        (click)="decline(invite.id)"
                        class="px-3 py-1 bg-red-500 text-white text-xs font-black"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="space-y-2">
            <p class="text-xs font-bold uppercase text-gray-500">Invitations envoyées</p>
            @if (matchmaking.outgoingInvites().length === 0) {
              <p class="text-gray-500 text-sm font-bold">Pas d'invitation en cours.</p>
            } @else {
              @for (invite of matchmaking.outgoingInvites(); track invite.id) {
                <div
                  class="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-2"
                >
                  <div>
                    <p class="font-bold text-sm">{{ invite.to_user }}</p>
                    <p class="text-xs text-gray-500">
                      {{ invite.time_control }} • {{ invite.status }}
                    </p>
                  </div>
                  @if (invite.status === 'pending') {
                    <button
                      (click)="decline(invite.id)"
                      class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-xs font-bold"
                    >
                      Annuler
                    </button>
                  }
                </div>
              }
            }
          </div>
        </section>
      </div>

      <section class="ui-card p-4 space-y-2">
        <p class="text-xs font-bold uppercase text-gray-500">Notifications</p>
        @if (matchmaking.notifications().length === 0) {
          <p class="text-gray-500 text-sm font-bold">Aucune notification pour l'instant.</p>
        } @else {
          <ul class="space-y-1 text-sm font-bold">
            @for (message of matchmaking.notifications(); track $index) {
              <li class="flex items-center space-x-2">
                <span>•</span> <span>{{ message }}</span>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `
})
export class MultiplayerLobbyComponent {
  matchmaking = inject(SupabaseMatchmakingService);

  selectedTimeControl = signal('3+2');
  inviteTimeControl = signal('5+0');
  friendId = signal('');

  async startQuickPlay() {
    console.log('[MultiplayerLobby] 🚀 Starting quick play with time control:', this.selectedTimeControl());
    const game = await this.matchmaking.joinQueue(this.selectedTimeControl());
    console.log('[MultiplayerLobby] 🎯 joinQueue returned:', game);
    // Navigation is handled by AppComponent effect watching activeGameId
  }

  cancelQueue() {
    this.matchmaking.leaveQueue(this.selectedTimeControl());
  }

  async sendInvite() {
    await this.matchmaking.sendInvite(this.friendId(), this.inviteTimeControl());
    this.friendId.set('');
  }

  async accept(inviteId: string) {
    console.log('[MultiplayerLobby] Accepting invite:', inviteId);
    console.log('[MultiplayerLobby] Current incoming invites:', this.matchmaking.incomingInvites());
    await this.matchmaking.acceptInvite(inviteId);
    // Navigation is handled by AppComponent effect
  }

  decline(inviteId: string) {
    this.matchmaking.declineInvite(inviteId);
  }
}
