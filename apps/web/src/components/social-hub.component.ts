import { Component, inject, signal, output, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseSocialService } from '../services/supabase-social.service';

@Component({
  selector: 'app-social-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
      <div class="max-w-6xl mx-auto p-4 md:p-8 font-sans h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">

          <!-- Left: Friends List & Requests -->
          <div class="w-full md:w-1/3 flex flex-col gap-6">

              <!-- Friend Requests -->
              @if (social.friendRequests().length > 0) {
                  <div class="ui-card ui-card-header p-4">
                      <h3 class="font-black text-sm uppercase mb-3 flex items-center">
                          <span class="mr-2">👋</span> Demandes d'amis ({{ social.friendRequests().length }})
                      </h3>
                      <div class="space-y-2">
                          @for (req of social.friendRequests(); track req.id) {
                              <div class="ui-card p-2 flex items-center justify-between">
                                  <div class="flex items-center space-x-2">
                                      <img [src]="req.avatar" class="w-8 h-8 border border-black rounded-full">
                                      <span class="font-bold text-xs truncate max-w-[80px]">{{ req.name }}</span>
                                  </div>
                                  <div class="flex space-x-1">
                                      <button (click)="acceptRequest(req.id)" class="ui-btn ui-btn-dark px-2 py-1 text-[10px]">Oui</button>
                                      <button (click)="declineRequest(req.id)" class="ui-btn ui-btn-ghost px-2 py-1 text-[10px]">Non</button>
                                  </div>
                              </div>
                          }
                      </div>
                  </div>
              }

              <!-- Friends List -->
              <div class="ui-card flex-1 flex flex-col overflow-hidden">
                  <div class="ui-card-header p-4 flex justify-between items-center">
                      <h3 class="font-black text-lg uppercase text-[#1D1C1C] dark:text-white">Mes Amis</h3>
                      <button (click)="showAddInput.set(!showAddInput())" class="ui-btn ui-btn-dark text-xs px-2 py-1">
                          + Ajouter
                      </button>
                  </div>

                  <!-- Add Input -->
                  @if (showAddInput()) {
                      <div class="ui-card-footer p-2 flex gap-2 bg-gray-100 dark:bg-gray-800">
                          <input #addInput type="text" placeholder="Pseudo..." class="ui-input text-sm">
                          <button (click)="addFriend(addInput.value); addInput.value = ''" class="ui-btn ui-btn-dark px-3 text-xs">OK</button>
                      </div>
                  }

                  <div class="flex-1 overflow-y-auto p-2 space-y-2">
                      @for (friend of social.friends(); track friend.id) {
                          <div (click)="selectFriend(friend.id)"
                               class="p-3 border-2 cursor-pointer transition-all hover:translate-x-1 flex items-center justify-between group"
                               [class.border-[#1D1C1C]]="selectedFriendId() !== friend.id"
                               [class.bg-white]="selectedFriendId() !== friend.id"
                               [class.dark:bg-[#1a1a1a]]="selectedFriendId() !== friend.id"
                               [class.bg-[#1D1C1C]]="selectedFriendId() === friend.id"
                               [class.text-white]="selectedFriendId() === friend.id"
                               [class.dark:bg-white]="selectedFriendId() === friend.id"
                               [class.dark:text-black]="selectedFriendId() === friend.id"
                               >

                              <div class="flex items-center space-x-3">
                                  <div class="relative">
                                      <img [src]="friend.avatar" class="w-10 h-10 border border-current rounded-full bg-gray-200">
                                      <div class="absolute -bottom-1 -right-1 w-3 h-3 border border-white rounded-full"
                                           [class.bg-green-500]="friend.status === 'online'"
                                           [class.bg-yellow-500]="friend.status === 'ingame'"
                                           [class.bg-gray-400]="friend.status === 'offline'"></div>
                                  </div>
                                  <div>
                                      <p class="font-bold text-sm leading-none">{{ friend.name }}</p>
                                      <p class="text-[10px] opacity-70 font-mono mt-0.5">
                                          {{ friend.status === 'ingame' ? friend.activity : (friend.status === 'online' ? 'En ligne' : 'Hors ligne') }}
                                      </p>
                                  </div>
                              </div>

                              <div class="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                  <button (click)="$event.stopPropagation(); goToProfile.emit(friend.id)" class="text-xs hover:scale-110 transition-transform" title="Profil">👤</button>
                                  <button (click)="$event.stopPropagation(); challenge(friend.id)" class="text-xs hover:scale-110 transition-transform" title="Défier">⚔️</button>
                              </div>

                          </div>
                      }
                  </div>
              </div>
          </div>

          <!-- Right: Chat Area -->
          <div class="ui-card flex-1 flex flex-col">

              @if (selectedFriend(); as friend) {
                  <div class="ui-card-header p-4 flex justify-between items-center">
                      <div class="flex items-center space-x-3">
                           <img [src]="friend.avatar" class="w-10 h-10 border-2 border-[#1D1C1C] dark:border-white rounded-full bg-white">
                           <div>
                               <h3 class="font-black text-lg uppercase text-[#1D1C1C] dark:text-white">{{ friend.name }}</h3>
                               <p class="text-xs text-gray-500 font-bold">{{ friend.elo }} ELO</p>
                           </div>
                      </div>
                      <div class="flex space-x-2">
                          <button (click)="challenge(friend.id)" class="ui-btn ui-btn-secondary px-4 py-2 text-xs font-black">
                              Défier
                          </button>
                      </div>
                  </div>

                  <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-[#0f0f0f]">
                      @for (msg of currentMessages(); track msg.timestamp) {
                          <div class="flex flex-col" [class.items-end]="msg.senderId !== friend.id" [class.items-start]="msg.senderId === friend.id">
                               <div class="max-w-[70%] p-3 border-2 border-[#1D1C1C] text-sm font-medium"
                                    [class.bg-[#FFF48D]]="msg.senderId !== friend.id"
                                    [class.bg-white]="msg.senderId === friend.id"
                                    [class.rounded-tl-none]="msg.senderId === friend.id"
                                    [class.rounded-tr-none]="msg.senderId !== friend.id">
                                   {{ msg.text }}
                               </div>
                               <span class="text-[10px] text-gray-400 mt-1 font-bold">{{ msg.timestamp | date:'shortTime' }}</span>
                          </div>
                      }
                      @if (currentMessages().length === 0) {
                          <div class="text-center text-gray-400 font-bold italic mt-20">
                              Aucun message. Dites bonjour !
                          </div>
                      }
                  </div>

                  <div class="ui-card-footer p-4 bg-white dark:bg-[#1a1a1a]">
                      <div class="flex space-x-2">
                          <input [ngModel]="messageInput()" (ngModelChange)="messageInput.set($event)" (keyup.enter)="sendMessage()" type="text" placeholder="Écrire un message..." class="ui-input flex-1">
                          <button (click)="sendMessage()" [disabled]="!messageInput().trim()" class="ui-btn ui-btn-dark px-6">
                              Envoyer
                          </button>
                      </div>
                  </div>

              } @else {
                  <div class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                      <div class="text-6xl mb-4 opacity-20">💬</div>
                      <p class="font-bold text-lg uppercase">Sélectionnez un ami ou envoyez une invitation pour chatter.</p>
                  </div>
              }

          </div>

      </div>
    `
})
export class SocialHubComponent implements OnInit {
    social = inject(SupabaseSocialService);
    goToProfile = output<string>();
    goToGame = output<string>();

    selectedFriendId = signal<string | null>(null);
    showAddInput = signal(false);
    messageInput = signal('');

    selectedFriend = computed(() =>
        this.social.friends().find(f => f.id === this.selectedFriendId()) || null
    );

    currentMessages = computed(() => {
       const id = this.selectedFriendId();
       return id ? this.social.messagesFor(id)() : [];
    });

    ngOnInit(): void {
      this.social.getFriends();
      this.social.getFriendRequests();
    }

    selectFriend(id: string) {
        this.selectedFriendId.set(id);
        this.social.getMessages(id);
    }

    async addFriend(name: string) {
        if(name.trim()) {
          try {
            const userId = await this.social.getUserIdByUsername(name);
            if (userId) {
              await this.social.sendFriendRequest(userId);
              alert('Friend request sent!');
            } else {
              alert('User not found.');
            }
          } catch (error) {
            console.error(error);
            alert('Error sending friend request.');
          }
          this.showAddInput.set(false);
        }
    }

    async acceptRequest(id: string) {
      try {
        await this.social.acceptFriendRequest(id);
      } catch (error) {
        console.error(error);
        alert('Unable to accept friend request.');
      }
    }

    async declineRequest(id: string) {
      try {
        await this.social.declineFriendRequest(id);
      } catch (error) {
        console.error(error);
        alert('Unable to decline friend request.');
      }
    }

    async sendMessage() {
        const id = this.selectedFriendId();
        const text = this.messageInput();
        if (id && text.trim()) {
            try {
              await this.social.sendMessage(id, text);
              this.messageInput.set('');
            } catch (error) {
              console.error(error);
              alert('Unable to send message.');
            }
        }
    }

    challenge(id: string) {
        alert(`Défi envoyé à ${id} ! (Redirection vers Lobby Ami...)`);
        // In real app: create friend lobby with specific config and redirect
    }
  }
