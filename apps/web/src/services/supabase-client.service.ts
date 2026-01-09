import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private supabase: SupabaseClient;
  
  session = signal<Session | null>(null);
  user = signal<User | null>(null);
  sessionReady = signal<boolean>(false);
  
  private profileEnsureInFlight: Promise<void> | null = null;

  readonly session$ = toObservable(this.session);
  readonly user$ = toObservable(this.user);
  readonly sessionReady$ = toObservable(this.sessionReady);

  currentUser(): User | null {
    return this.user();
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
    return this.supabase.auth.signOut();
  }

  isAnonymousUser(user?: User | null) {
    const target = user ?? this.user();
    if (!target) return false;
    const metadata = target.app_metadata as Record<string, unknown> | undefined;
    return Boolean((target as any).is_anonymous || metadata?.provider === 'anonymous');
  }

  async ensureAnonymousSession() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      await this.ensureCurrentUserProfile(data.session.user);
      return data.session;
    }

    const { data: signInData, error } = await this.supabase.auth.signInAnonymously();
    if (error || !signInData?.session) {
      throw error ?? new Error('anonymous_signin_failed');
    }

    await this.ensureCurrentUserProfile(signInData.session.user);
    return signInData.session;
  }

  async ensureCurrentUserProfile(user?: User | null) {
    let resolvedUser = user ?? this.user();
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
    this.session.set(data.session ?? null);
    this.user.set(data.session?.user ?? null);
    this.sessionReady.set(true);
    if (data.session?.user) {
      await this.ensureCurrentUserProfile();
    }

    this.supabase.auth.onAuthStateChange((_, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
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

    // Check if profile exists first to avoid 406/409 errors
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, username, avatar_url, elo, onboarding_completed, bio')
      .eq('id', user.id)
      .limit(1);

    if (profiles && profiles.length > 0) {
      // Update metadata if needed or just return
      return;
    }

    let finalUsername = username;

    const performInsert = async (name: string) => {
      return this.supabase.from('profiles').insert({
        id: user.id,
        username: name,
        avatar_url: avatarUrl
      });
    };

    let { error } = await performInsert(finalUsername);

    // If username is taken, try a fallback with some randomization
    if (error?.code === '23505' && error.message?.includes('profiles_username_key')) {
      finalUsername = `${username}-${Math.floor(Math.random() * 1000)}`;
      const { error: retryError } = await performInsert(finalUsername);
      error = retryError;
    }

    if (error) {
      console.error('Error ensuring profile exists:', error);
    }
  }
}
