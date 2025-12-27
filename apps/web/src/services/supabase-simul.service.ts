import { Injectable, signal, computed } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { GameStatus, Simul, SimulGame, SimulStatus, SimulTable, SimulWithTables } from '../models/simul.model';

interface RpcError {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseSimulService {
  private get supabase() {
    return this.supabaseClient.client;
  }

  simulList = signal<SimulWithTables[]>([]);
  activeSimul = signal<SimulWithTables | null>(null);
  activeTable = signal<SimulTable | null>(null);
  activeGame = signal<SimulGame | null>(null);

  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private supabaseClient: SupabaseClientService) {}

  simulStatus = computed((): SimulStatus | null => this.activeSimul()?.status ?? null);
  tableStatus = computed((): string | null => this.activeTable()?.status ?? null);
  gameStatus = computed((): GameStatus | null => this.activeGame()?.status ?? null);

  async fetchSimuls() {
    this.loading.set(true);
    this.error.set(null);
    const { data, error } = await this.supabase
      .from('simuls')
      .select('*, simul_tables(*)')
      .order('created_at', { ascending: false });

    if (error) {
      this.error.set(error.message);
    } else {
      this.simulList.set((data as SimulWithTables[]) ?? []);
    }
    this.loading.set(false);
  }

  async fetchSimul(simulId: string) {
    this.loading.set(true);
    this.error.set(null);
    const { data, error } = await this.supabase
      .from('simuls')
      .select('*, simul_tables(*)')
      .eq('id', simulId)
      .maybeSingle();

    if (error) {
      this.error.set(error.message);
      this.activeSimul.set(null);
      this.activeTable.set(null);
      this.activeGame.set(null);
    } else {
      const simul = (data as SimulWithTables) ?? null;
      this.activeSimul.set(simul);
      if (simul && this.supabaseClient.currentUser) {
        const seat = simul.simul_tables.find((t) => t.guest_id === this.supabaseClient.currentUser?.id) ?? null;
        if (seat) this.activeTable.set(seat);
      }
    }
    this.loading.set(false);
  }

  async createSimul(name: string, tablesCount: number) {
    const user = await this.supabase.auth.getUser();
    if (!user.data.user) {
      this.error.set('Connexion requise');
      throw new Error('Connexion requise');
    }

    this.loading.set(true);
    this.error.set(null);
    const { data, error } = await this.supabase.rpc('create_simul', {
      p_host_id: user.data.user.id,
      p_name: name,
      p_tables_count: tablesCount,
    });

    this.loading.set(false);

    if (error) {
      this.error.set(error.message);
      throw error;
    }

    await this.fetchSimuls();
    if (data) {
      await this.fetchSimul((data as Simul).id);
    }
    return data as Simul;
  }

  async joinSimul(simulId: string) {
    const user = await this.supabase.auth.getUser();
    if (!user.data.user) {
      this.error.set('Connexion requise');
      throw new Error('Connexion requise');
    }

    this.loading.set(true);
    this.error.set(null);
    const { data, error } = await this.supabase.rpc('join_simul', { p_simul_id: simulId });
    this.loading.set(false);

    if (error) {
      this.error.set(error.message);
      throw error;
    }

    await this.fetchSimul(simulId);
    return data as SimulTable;
  }

  async startTable(simulTableId: string) {
    const { data, error } = await this.supabase.rpc('start_simul_game', { p_simul_table_id: simulTableId });
    if (error) {
      this.error.set(error.message);
      throw error;
    }

    const game = data as SimulGame;
    this.activeGame.set(game);
    await this.fetchSimul(game.simul_id ?? '');
    return game;
  }

  async fetchTableGame(tableId: string) {
    this.loading.set(true);
    const { data, error } = await this.supabase
      .from('simul_tables')
      .select('*, games(*)')
      .eq('id', tableId)
      .maybeSingle();
    this.loading.set(false);

    if (error) {
      this.error.set(error.message);
      return null;
    }

    if (data && (data as any).games) {
      this.activeGame.set((data as any).games as SimulGame);
      this.activeTable.set({
        id: (data as any).id,
        simul_id: (data as any).simul_id,
        guest_id: (data as any).guest_id,
        game_id: (data as any).game_id,
        seat_no: (data as any).seat_no,
        status: (data as any).status,
        created_at: (data as any).created_at,
        updated_at: (data as any).updated_at,
      });
    }
    return this.activeGame();
  }

  clearContext() {
    this.activeSimul.set(null);
    this.activeTable.set(null);
    this.activeGame.set(null);
    this.error.set(null);
  }

  friendlyError(err: unknown): string {
    if (!err) return 'Erreur inconnue';
    const rpc = err as RpcError;
    if (rpc.message?.includes('no seat')) return 'Toutes les places sont déjà prises.';
    if (rpc.message?.includes('not open')) return 'Les inscriptions sont closes.';
    if (rpc.message?.includes('only host')) return "Seul l'hôte peut effectuer cette action.";
    return rpc.message || 'Une erreur est survenue.';
  }
}
