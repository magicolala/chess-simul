
import { Component, inject, output } from '@angular/core';
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
          <h2 class="text-4xl font-black font-display text-[#1D1C1C] dark:text-white uppercase tracking-tighter">
            Multijoueur
          </h2>
          <p class="text-gray-500 font-bold">Trouve un adversaire ou invite un ami.</p>
        </div>
        <div class="text-xs uppercase font-black text-gray-500 bg-gray-100 dark:bg-[#1a1a1a] px-3 py-1 border-2 border-[#1D1C1C] dark:border-white">
          Hors simul
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#1a1a1a] p-6 wero-shadow space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold uppercase text-gray-500">Partie rapide</p>
              <h3 class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white">Quick Play</h3>
            </div>
            <span class="text-lg">⚡</span>
          </div>

          <label class="text-xs font-bold uppercase text-gray-500">Cadence</label>
          <select [(ngModel)]="selectedTimeControl" class="w-full border-2 border-[#1D1C1C] dark:border-white bg-transparent p-2 font-mono font-bold">
            <option value="3+2">3+2 Blitz</option>
            <option value="5+0">5+0 Standard</option>
            <option value="10+0">10+0 Rapide</option>
          </select>

          <div class="flex items-center space-x-2">
            <button
              (click)="startQuickPlay()"
              class="flex-1 py-3 bg-[#FFF48D] text-[#1D1C1C] font-black font-display uppercase border-2 border-[#1D1C1C] hover:bg-[#7AF7F7]"
              [disabled]="matchmaking.queueStatus() === 'searching'"
            >
              {{ matchmaking.queueStatus() === 'searching' ? 'Recherche...' : 'Jouer maintenant' }}
            </button>
            @if (matchmaking.queueStatus() === 'searching') {
              <button
                (click)="cancelQueue()"
                class="px-4 py-3 border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#1a1a1a] font-bold"
              >
                Annuler
              </button>
            }
          </div>

          @if (matchmaking.activeGameId()) {
            <div class="p-3 bg-green-100 border-2 border-green-500 text-green-900 font-bold text-sm">
              Partie créée : {{ matchmaking.activeGameId() }}
            </div>
          } @else {
            <p class="text-sm text-gray-500 font-bold">Deux joueurs dans la file créent automatiquement une partie.</p>
          }
        </section>

        <section class="border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#1a1a1a] p-6 wero-shadow space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold uppercase text-gray-500">Invitations</p>
              <h3 class="text-2xl font-black font-display text-[#1D1C1C] dark:text-white">Invite a friend</h3>
            </div>
            <span class="text-lg">🤝</span>
          </div>

          <label class="text-xs font-bold uppercase text-gray-500">ID de l'ami</label>
          <input
            [(ngModel)]="friendId"
            placeholder="uuid du joueur"
            class="w-full border-2 border-[#1D1C1C] dark:border-white bg-transparent p-2 font-mono"
          />

          <label class="text-xs font-bold uppercase text-gray-500">Cadence</label>
          <select [(ngModel)]="inviteTimeControl" class="w-full border-2 border-[#1D1C1C] dark:border-white bg-transparent p-2 font-mono font-bold">
            <option value="5+0">5+0</option>
            <option value="10+0">10+0</option>
            <option value="3+2">3+2</option>
          </select>

          <button
            (click)="sendInvite()"
            class="w-full py-3 bg-[#1D1C1C] dark:bg-white text-white dark:text-[#1D1C1C] font-black font-display uppercase border-2 border-[#1D1C1C] dark:border-white"
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
                  <div class="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-2">
                    <div>
                      <p class="font-bold text-sm">{{ invite.from_user }}</p>
                      <p class="text-xs text-gray-500">Cadence {{ invite.time_control }}</p>
                    </div>
                    <div class="space-x-2">
                      <button (click)="accept(invite.id)" class="px-3 py-1 bg-green-500 text-white text-xs font-black">Accepter</button>
                      <button (click)="decline(invite.id)" class="px-3 py-1 bg-red-500 text-white text-xs font-black">Refuser</button>
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
                <div class="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-2">
                  <div>
                    <p class="font-bold text-sm">{{ invite.to_user }}</p>
                    <p class="text-xs text-gray-500">{{ invite.time_control }} • {{ invite.status }}</p>
                  </div>
                  @if (invite.status === 'pending') {
                    <button (click)="decline(invite.id)" class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-xs font-bold">Annuler</button>
                  }
                </div>
              }
            }
          </div>
        </section>
      </div>

      <section class="border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-[#1a1a1a] p-4 space-y-2">
        <p class="text-xs font-bold uppercase text-gray-500">Notifications</p>
        @if (matchmaking.notifications().length === 0) {
          <p class="text-gray-500 text-sm font-bold">Aucune notification pour l'instant.</p>
        } @else {
          <ul class="space-y-1 text-sm font-bold">
            @for (message of matchmaking.notifications(); track message) {
              <li class="flex items-center space-x-2"><span>•</span> <span>{{ message }}</span></li>
            }
          </ul>
        }
      </section>
    </div>
  `
})
export class MultiplayerLobbyComponent {
  matchmaking = inject(SupabaseMatchmakingService);

  joined = output<string | null>();

  selectedTimeControl = '3+2';
  inviteTimeControl = '5+0';
  friendId = '';

  async startQuickPlay() {
    const game = await this.matchmaking.joinQueue(this.selectedTimeControl);
    if (game) {
      this.joined.emit(game.id ?? null);
    }
  }

  cancelQueue() {
    this.matchmaking.leaveQueue(this.selectedTimeControl);
  }

  async sendInvite() {
    await this.matchmaking.sendInvite(this.friendId, this.inviteTimeControl);
    this.friendId = '';
  }

  async accept(inviteId: string) {
    const game = await this.matchmaking.acceptInvite(inviteId);
    if (game) {
      this.joined.emit(game.id ?? null);
    }
  }

  decline(inviteId: string) {
    this.matchmaking.declineInvite(inviteId);
  }
}
