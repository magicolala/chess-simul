import { Injectable, effect, inject, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import type { InviteRow } from '@chess-simul/shared';

@Injectable({
  providedIn: 'root'
})
export class SupabaseMatchmakingService {
  private supabaseService = inject(SupabaseClientService);
  private supabase = this.supabaseService.client;

  queueStatus = signal<'idle' | 'searching' | 'matched'>('idle');
  notifications = signal<string[]>([]);
  activeGameId = signal<string | null>(null);
  incomingInvites = signal<InviteRow[]>([]);
  outgoingInvites = signal<InviteRow[]>([]);

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
      }
    );
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
    if (!this.ensureUser()) return null;

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
      console.error('joinQueue error', error);
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
    console.log('[MatchmakingService] Sending invite from:', user?.id, 'to:', toUserId, 'TC:', timeControl);
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
      console.log('[MatchmakingService] Pending invite already exists:', existing.id);
      this.notify('Une invitation est déjà en attente pour ce joueur.');
      return;
    }

    const { data, error } = await this.supabase
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

    console.log('[MatchmakingService] Invite sent successfully, data:', data);
    this.notify('Invitation envoyée.');
    await this.refreshInvites();
  }

  async acceptInvite(inviteId: string) {
    if (!this.ensureUser()) return null;

    const { data, error } = await this.supabase.functions.invoke('accept-invite', {
      body: { invite_id: inviteId }
    });

    if (error) {
      console.error('acceptInvite error', error);
      this.notify("Impossible d'accepter cette invitation.");
      return null;
    }

    if (data?.game) {
      this.activeGameId.set(data.game.id);
      this.queueStatus.set('matched');
      this.notify('Invitation acceptée, partie créée.');
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('refreshInvites error', error);
      return;
    }

    const incoming = (data ?? []).filter((invite) => invite.to_user === user.id);
    const outgoing = (data ?? []).filter((invite) => invite.from_user === user.id);

    this.incomingInvites.set(incoming);
    this.outgoingInvites.set(outgoing);
  }
}
