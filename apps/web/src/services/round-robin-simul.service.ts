import { Injectable, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { environment } from '../environments/environment';
import type {
  RoundRobinGameSummary,
  RoundRobinJoinResponse,
  RoundRobinSessionResponse,
  RoundRobinStartResponse
} from '@chess-simul/shared';

@Injectable({ providedIn: 'root' })
export class RoundRobinSimulService {
  private baseUrl = `${environment.supabaseUrl}/functions/v1/simul-sessions`;

  session = signal<RoundRobinJoinResponse['session'] | null>(null);
  games = signal<RoundRobinGameSummary[]>([]);
  inviteLink = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private supabaseClient: SupabaseClientService) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { data } = await this.supabaseClient.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('Connexion requise');
    }

    const headers: HeadersInit = {
      apikey: environment.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    };

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    let payload: Record<string, unknown> = {};
    const text = await response.text();
    try {
      if (text) payload = JSON.parse(text);
    } catch {
      console.error('[RoundRobinSimulService] Failed to parse response JSON', { text, path });
    }

    if (!response.ok) {
      console.error('[RoundRobinSimulService] Request failed', {
        status: response.status,
        path,
        error: payload?.error,
        details: payload
      });
      throw new Error((payload?.error as string | undefined) ?? `Erreur serveur (${response.status})`);
    }

    return payload as T;
  }

  async createSession() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const payload = await this.request<RoundRobinSessionResponse>('', { method: 'POST' });
      this.session.set(payload.session ?? null);
      this.inviteLink.set(payload.inviteLink ?? null);
      return payload.session;
    } catch (error) {
      const msg = (error as Error).message ?? 'Erreur de création';
      this.error.set(msg);
      if (msg === 'Connexion requise') {
        throw error;
      }
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async fetchSession(sessionId: string) {
    console.error('[RR SimulService] fetchSession called for', sessionId);
    this.loading.set(true);
    this.error.set(null);

    try {
      const payload = await this.request<RoundRobinJoinResponse>(`/${sessionId}`, {
        method: 'GET'
      });
      this.session.set(payload.session ?? null);
      return payload.session;
    } catch (error) {
      this.error.set((error as Error).message ?? 'Erreur de chargement');
      this.session.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async fetchSessionByInvite(inviteCode: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const payload = await this.request<RoundRobinJoinResponse>(`/invite/${inviteCode}`, {
        method: 'GET'
      });
      // console.log('[RoundRobinSimulService] Resolved session by invite', payload.session);
      this.session.set(payload.session ?? null);
      return payload.session;
    } catch (error) {
      this.error.set((error as Error).message ?? 'Erreur de chargement');
      this.session.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async joinSession(sessionId: string, inviteCode: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const payload = await this.request<RoundRobinJoinResponse>(`/${sessionId}/join`, {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode })
      });
      // console.log('[RoundRobinSimulService] Joined session', payload.session);
      this.session.set(payload.session ?? null);
      return payload.session;
    } catch (error) {
      this.error.set((error as Error).message ?? 'Erreur de connexion');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async startSession(sessionId: string) {
    // console.log('[RoundRobinSimulService] Starting session...', sessionId);
    this.loading.set(true);
    this.error.set(null);

    try {
      const payload = await this.request<RoundRobinStartResponse>(`/${sessionId}/start`, {
        method: 'POST'
      });
      await this.fetchSession(sessionId);
      await this.fetchGames(sessionId);
      return payload;
    } catch (error) {
      this.error.set((error as Error).message ?? 'Erreur de démarrage');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async fetchGames(sessionId: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const payload = await this.request<{ games: RoundRobinGameSummary[] }>(
        `/${sessionId}/games`,
        { method: 'GET' }
      );
      this.games.set(payload.games ?? []);
      return payload.games ?? [];
    } catch (error) {
      this.error.set((error as Error).message ?? 'Erreur de chargement');
      this.games.set([]);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async deleteSession(sessionId: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.request<{ success: boolean }>(`/${sessionId}`, { method: 'DELETE' });
      this.session.set(null);
      this.inviteLink.set(null);
      this.games.set([]);
      return true;
    } catch (error) {
      this.error.set((error as Error).message ?? 'Erreur de suppression');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
