import { Injectable, signal, computed } from '@angular/core';
import { type SupabaseClientService } from './supabase-client.service';
import {
  type GameStatus,
  type Simul,
  type SimulGame,
  type SimulStatus,
  type SimulTable,
  type SimulWithTables,
  type TimeControl
} from '../models/simul.model';

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

  constructor(private supabaseClient: SupabaseClientService) { }

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
      if (simul && this.supabaseClient.currentUser()) {
        const seat =
          simul.simul_tables.find(
            (t) => t.challenger_id === this.supabaseClient.currentUser()?.id
          ) ?? null;
        if (seat) {
          this.activeTable.set(seat);
        }
      }
    }
    this.loading.set(false);
  }

  async createSimul(name: string, tablesCount: number, timeControl: TimeControl) {
    const user = await this.supabase.auth.getUser();
    if (!user.data.user) {
      this.error.set('Connexion requise');
      throw new Error('Connexion requise');
    }

    await this.supabaseClient.ensureCurrentUserProfile(user.data.user);

    this.loading.set(true);
    this.error.set(null);
    const { data: newSimul, error: simulError } = await this.supabase
      .from('simuls')
      .insert({
        host_id: user.data.user.id,
        name,
        status: 'open',
        time_control: timeControl
      })
      .select('*, simul_tables(*)')
      .maybeSingle();

    if (simulError || !newSimul) {
      this.loading.set(false);
      if (simulError) {
        this.error.set(simulError.message);
      }
      throw simulError ?? new Error('Impossible de créer la simultanée');
    }

    const seats = Array.from({ length: tablesCount }, (_, idx) => ({
      simul_id: newSimul.id,
      seat_no: idx + 1,
      status: 'open'
    }));

    const { error: tablesError } = await this.supabase.from('simul_tables').insert(seats);
    this.loading.set(false);

    if (tablesError) {
      this.error.set(tablesError.message);
      throw tablesError;
    }

    await this.fetchSimuls();
    await this.fetchSimul(newSimul.id);
    return newSimul as unknown as Simul;
  }

  async joinSimul(simulId: string) {
    const user = await this.supabase.auth.getUser();
    if (!user.data.user) {
      this.error.set('Connexion requise');
      throw new Error('Connexion requise');
    }

    this.loading.set(true);
    this.error.set(null);
    const { data, error } = await this.supabase
      .from('simul_tables')
      .update({ challenger_id: user.data.user.id, status: 'playing' })
      .eq('simul_id', simulId)
      .eq('status', 'open')
      .is('challenger_id', null)
      .order('seat_no', { ascending: true })
      .limit(1)
      .select()
      .maybeSingle();
    this.loading.set(false);

    if (error || !data) {
      this.error.set(error?.message ?? 'Toutes les places sont déjà prises.');
      throw error ?? new Error('no open seat');
    }

    await this.fetchSimul(simulId);
    this.activeTable.set(data as SimulTable);
    return data as SimulTable;
  }

  async startTable(simulTableId: string) {
    const user = await this.supabase.auth.getUser();
    if (!user.data.user) {
      this.error.set('Connexion requise');
      throw new Error('Connexion requise');
    }

    const table = await this.getTable(simulTableId);
    if (!table) { return null; }

    const simul = await this.getSimul(table.simul_id);
    if (!simul) { return null; }

    this.validateStartTable(simul, table, user.data.user.id);

    if (table.game_id) {
      return this.loadExistingGame(table.game_id, table.simul_id);
    }

    return this.createNewSimulGame(simul, table);
  }

  private async getTable(id: string) {
    const { data, error } = await this.supabase
      .from('simul_tables')
      .select('id, simul_id, challenger_id, game_id, seat_no, status')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      this.error.set(error?.message ?? 'Table introuvable');
      if (error) { throw error; }
      return null; // Should ideally throw if not found to stop execution or handle consistently
    }
    return data;
  }

  private async getSimul(id: string) {
    const { data, error } = await this.supabase
      .from('simuls')
      .select('id, host_id, status')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      this.error.set(error?.message ?? 'Simultanée introuvable');
      if (error) { throw error; }
      return null;
    }
    return data;
  }

  private validateStartTable(simul: any, table: any, userId: string) {
    if (simul.host_id !== userId) {
      this.error.set("Seul l'hôte peut démarrer une table");
      throw new Error('only host can start');
    }

    if (!table.challenger_id) {
      this.error.set('Aucun challenger sur cette table');
      throw new Error('table has no challenger');
    }
  }

  private async loadExistingGame(gameId: string, simulId: string) {
    const { data: existingGame } = await this.supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
    if (existingGame) {
      this.activeGame.set(existingGame as SimulGame);
      await this.fetchSimul(simulId);
      return existingGame as SimulGame;
    }
    return null; // Or throw?
  }

  private async createNewSimulGame(simul: any, table: any) {
    const { data: newGame, error: gameError } = await this.supabase
      .from('games')
      .insert({
        mode: 'simul',
        simul_id: table.simul_id,
        host_id: simul.host_id,
        white_id: simul.host_id,
        black_id: table.challenger_id,
        status: 'waiting'
      })
      .select()
      .maybeSingle();

    if (gameError || !newGame) {
      this.error.set(gameError?.message ?? 'Impossible de créer la partie');
      throw gameError ?? new Error('game creation failed');
    }

    await this.supabase
      .from('simul_tables')
      .update({ game_id: newGame.id, status: 'playing' })
      .eq('id', table.id);

    await this.supabase
      .from('simuls')
      .update({ status: 'running' })
      .eq('id', table.simul_id)
      .eq('status', 'open');

    this.activeGame.set(newGame as SimulGame);
    await this.fetchSimul(table.simul_id);
    return newGame as SimulGame;
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
        challenger_id: (data as any).challenger_id,
        game_id: (data as any).game_id,
        seat_no: (data as any).seat_no,
        status: (data as any).status,
        created_at: (data as any).created_at,
        updated_at: (data as any).updated_at
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
    if (!err) {
      return 'Erreur inconnue';
    }
    const rpc = err as RpcError;
    if (rpc.message?.includes('no open')) {
      return 'Toutes les places sont déjà prises.';
    }
    if (rpc.message?.includes('not open')) {
      return 'Les inscriptions sont closes.';
    }
    if (rpc.message?.includes('only host')) {
      return "Seul l'hôte peut effectuer cette action.";
    }
    if (rpc.message?.includes('no challenger')) {
      return 'Cette table n’a pas encore de challenger.';
    }
    return rpc.message || 'Une erreur est survenue.';
  }
}
