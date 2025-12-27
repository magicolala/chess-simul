import { Injectable, OnDestroy, inject } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { PresenceUser, SimulTableRow } from '../models/realtime.model';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class RealtimeSimulService implements OnDestroy {
  private readonly supabase = inject(SupabaseClientService).client;

  private channel?: RealtimeChannel;

  private tablesSubject = new BehaviorSubject<SimulTableRow[]>([]);
  private presenceSubject = new BehaviorSubject<PresenceUser[]>([]);

  readonly tables$ = this.tablesSubject.asObservable();
  readonly presence$ = this.presenceSubject.asObservable();

  subscribe(simulId: string, presence?: PresenceUser) {
    if (!simulId) return;

    void this.teardown();
    this.tablesSubject.next([]);
    this.presenceSubject.next([]);

    const channel = this.supabase.channel(`simul:${simulId}`, {
      config: {
        presence: { key: presence?.user_id ?? `observer-${Date.now()}` }
      }
    });

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'simul_tables', filter: `simul_id=eq.${simulId}` },
      (payload: RealtimePostgresChangesPayload<SimulTableRow>) => {
        this.upsertTable(payload.new as SimulTableRow);
      }
    );

    channel.on('presence', { event: 'sync' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'join' }, () => this.refreshPresence(channel));
    channel.on('presence', { event: 'leave' }, () => this.refreshPresence(channel));

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && presence) {
        channel.track(presence);
      }
    });

    this.channel = channel;
  }

  preloadTables(tables: SimulTableRow[]) {
    this.tablesSubject.next(tables);
  }

  async teardown() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = undefined;
    }
  }

  ngOnDestroy(): void {
    void this.teardown();
  }

  private upsertTable(table: SimulTableRow | null) {
    if (!table?.id) return;

    const nextTables = [...this.tablesSubject.value.filter((t) => t.id !== table.id), table];
    this.tablesSubject.next(nextTables);
  }

  private refreshPresence(channel: RealtimeChannel) {
    const state = channel.presenceState<PresenceUser>();
    const flattened = Object.values(state).flat();
    this.presenceSubject.next(flattened);
  }
}
