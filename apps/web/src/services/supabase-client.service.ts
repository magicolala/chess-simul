import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private userSubject = new BehaviorSubject<User | null>(null);
  private sessionReadySubject = new BehaviorSubject<boolean>(false);
  private profileEnsureInFlight: Promise<void> | null = null;

  readonly session$: Observable<Session | null> = this.sessionSubject.asObservable();
  readonly user$: Observable<User | null> = this.userSubject.asObservable();
  readonly sessionReady$: Observable<boolean> = this.sessionReadySubject.asObservable();
  readonly currentUserSignal = toSignal(this.user$, { initialValue: null });

  currentUser(): User | null {
    return this.userSubject.value;
  }

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.initAuthListeners();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  async ensureCurrentUserProfile(user?: User | null) {
    let resolvedUser = user ?? this.userSubject.value;
    if (!resolvedUser) {
      const { data } = await this.supabase.auth.getUser();
      resolvedUser = data.user ?? null;
    }

    if (!resolvedUser) return;

    this.profileEnsureInFlight ??= this.ensureProfileExists(resolvedUser).finally(() => {
      this.profileEnsureInFlight = null;
    });

    await this.profileEnsureInFlight;
  }

  private async initAuthListeners() {
    const { data } = await this.supabase.auth.getSession();
    this.sessionSubject.next(data.session ?? null);
    this.userSubject.next(data.session?.user ?? null);
    this.sessionReadySubject.next(true);
    if (data.session?.user) {
      await this.ensureCurrentUserProfile();
    }

    this.supabase.auth.onAuthStateChange((_, session) => {
      this.sessionSubject.next(session);
      this.userSubject.next(session?.user ?? null);
      if (session?.user) {
        void this.ensureCurrentUserProfile();
      }
    });
  }

  private async ensureProfileExists(user: User) {
    const username =
      (user.user_metadata?.user_name as string | undefined) ??
      user.email?.split('@')[0] ??
      `player-${user.id.slice(0, 8)}`;

    const avatarUrl = (user.user_metadata?.avatar_url as string | undefined | null) ?? null;

    const { error } = await this.supabase.from('profiles').upsert(
      {
        id: user.id,
        username,
        avatar_url: avatarUrl
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Error ensuring profile exists:', error);
    }
  }
}
