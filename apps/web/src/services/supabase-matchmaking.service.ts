import { Injectable, effect, inject, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { InviteRow } from '@chess-simul/shared';
import { GameRow } from '../models/realtime.model';
import { RealtimeGameService } from './realtime-game.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseMatchmakingService {
  private supabaseService = inject(SupabaseClientService);
  private realtimeGame = inject(RealtimeGameService);
  private supabase = this.supabaseService.client;

  queueStatus = signal<'idle' | 'searching' | 'matched'>('idle');
  notifications = signal<string[]>([]);
  activeGameId = signal<string | null>(null);
  incomingInvites = signal<InviteRow[]>([]);
  outgoingInvites = signal<InviteRow[]>([]);
  activeGames = signal<GameRow[]>([]);

  private gamesChannel?: RealtimeChannel;

  constructor() {
    effect(
      () => {
        const user = this.supabaseService.currentUser();
        if (!user) {
          this.queueStatus.set('idle');
          this.activeGameId.set(null);
          this.incomingInvites.set([]);
          this.outgoingInvites.set([]);
          return;
        }

        this.refreshInvites();
        this.refreshActiveGames();
        this.subscribeToGames(user.id);
      }
    );
  }

  private subscribeToGames(userId: string) {
    if (this.gamesChannel) {
      this.supabase.removeChannel(this.gamesChannel);
    }



    this.gamesChannel = this.supabase
      .channel(`active-games-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          const game = payload.new as GameRow;
          // Refresh if user is involved
          if (game && (game.white_id === userId || game.black_id === userId)) {

             this.refreshActiveGames();
          }
          // Also refresh on deletes if user was involved (handled by refresh)
          if (payload.eventType === 'DELETE') {
             this.refreshActiveGames();
          }
        }
      )
      .subscribe();
  }

  teardown() {
    if (this.gamesChannel) {
      this.supabase.removeChannel(this.gamesChannel);
      this.gamesChannel = undefined;
    }
  }

  private ensureUser() {
    const user = this.supabaseService.currentUser();
    if (!user) {
      this.notify('Connectez-vous pour jouer en ligne.');
    }
    return user;
  }

  private notify(message: string) {
    this.notifications.update((messages) => [message, ...messages].slice(0, 5));
  }

  async joinQueue(timeControl: string) {
    const user = this.ensureUser();
    if (!user) return null;

    const trimmed = timeControl.trim();
    if (!trimmed) {
      this.notify('Choisissez une cadence pour jouer.');
      return null;
    }



    this.queueStatus.set('searching');
    const { data, error } = await this.supabase.functions.invoke('join-queue', {
      body: { time_control: trimmed }
    });



    if (error) {
      console.error('[MatchmakingService] ❌ joinQueue error', error);
      this.queueStatus.set('idle');
      this.notify("Impossible de rejoindre la file d'attente.");
      return null;
    }

    if (data?.matched && data.game) {

      this.activeGameId.set(data.game.id);
      this.queueStatus.set('matched');
      this.notify('Adversaire trouvé ! La partie est prête.');
      return data.game;
    }


    this.notify('En attente d’un adversaire...');
    return null;
  }

  async leaveQueue(timeControl?: string) {
    if (!this.ensureUser()) return;

    const body = timeControl ? { time_control: timeControl } : undefined;
    const { error } = await this.supabase.functions.invoke('leave-queue', { body });

    if (error) {
      console.error('leaveQueue error', error);
      this.notify('Impossible de quitter la file.');
      return;
    }

    this.queueStatus.set('idle');
    this.notify('Recherche annulée.');
  }

  async sendInvite(toUserId: string, timeControl: string) {
    const user = this.ensureUser();

    if (!user) return;

    const target = toUserId.trim();
    const cadence = timeControl.trim();
    if (!target || !cadence) {
      console.warn('[MatchmakingService] Missing target or cadence:', { target, cadence });
      this.notify("Complétez l'identifiant et la cadence.");
      return;
    }

    // Check for existing pending invite first
    const { data: existing } = await this.supabase
      .from('invites')
      .select('id')
      .eq('from_user', user.id)
      .eq('to_user', target)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {

      this.notify('Une invitation est déjà en attente pour ce joueur.');
      return;
    }

    const { error } = await this.supabase
      .from('invites')
      .insert({ from_user: user.id, to_user: target, time_control: cadence })
      .select();

    if (error) {
      console.error('[MatchmakingService] sendInvite error:', error);
      // Handle duplicate constraint violation gracefully
      if (error.code === '23505') {
        this.notify('Une invitation est déjà en attente pour ce joueur.');
        return;
      }
      this.notify('Invitation impossible pour le moment.');
      return;
    }


    this.notify('Invitation envoyée.');
    await this.refreshInvites();
  }

  async acceptInvite(inviteId: string) {
    if (!this.ensureUser()) return null;


    
    const { data: rawData, error } = await this.supabase.functions.invoke('accept-invite', {
      body: { invite_id: inviteId }
    });

    // Parse if response is a string
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;



    if (error) {
      console.error('acceptInvite error', error);
      this.notify("Impossible d'accepter cette invitation.");
      return null;
    }

    if (data?.game) {

      this.realtimeGame.preloadGame(data.game);
      this.activeGameId.set(data.game.id);
      this.queueStatus.set('matched');
      this.notify('Invitation acceptée, partie créée.');
    } else {
      console.warn('[MatchmakingService] ⚠️ No game in response:', data);
    }

    await this.refreshInvites();
    return data?.game ?? null;
  }

  async declineInvite(inviteId: string) {
    const user = this.ensureUser();
    if (!user) return;

    const { error } = await this.supabase
      .from('invites')
      .update({ status: 'declined' })
      .eq('id', inviteId)
      .or(`to_user.eq.${user.id},from_user.eq.${user.id}`);

    if (error) {
      console.error('declineInvite error', error);
      this.notify('Impossible de mettre à jour cette invitation.');
      return;
    }

    this.notify('Invitation mise à jour.');
    await this.refreshInvites();
  }

  async refreshInvites() {
    const user = this.supabaseService.currentUser();
    if (!user) return;



    const { data, error } = await this.supabase
      .from('invites')
      .select('id, from_user, to_user, time_control, status, created_at, updated_at')
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MatchmakingService] ❌ refreshInvites error', error);
      return;
    }

    const incoming = (data ?? []).filter((invite) => invite.to_user === user.id);
    const outgoing = (data ?? []).filter((invite) => invite.from_user === user.id);



    this.incomingInvites.set(incoming);
    this.outgoingInvites.set(outgoing);
  }

  async refreshActiveGames() {
    const user = this.supabaseService.currentUser();
    if (!user) return;



    const { data, error } = await this.supabase
      .from('games')
      .select(`
        *,
        white_profile:white_id(username, avatar_url),
        black_profile:black_id(username, avatar_url)
      `)
      .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MatchmakingService] ❌ refreshActiveGames error', error);
      return;
    }


    this.activeGames.set(data ?? []);
  }
}
