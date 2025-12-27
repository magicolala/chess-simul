import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  private userSubject = new BehaviorSubject<User | null>(null);
  private sessionReadySubject = new BehaviorSubject<boolean>(false);

  readonly session$: Observable<Session | null> = this.sessionSubject.asObservable();
  readonly user$: Observable<User | null> = this.userSubject.asObservable();
  readonly sessionReady$: Observable<boolean> = this.sessionReadySubject.asObservable();

  get currentUser(): User | null {
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

  private async initAuthListeners() {
    const { data } = await this.supabase.auth.getSession();
    this.sessionSubject.next(data.session ?? null);
    this.userSubject.next(data.session?.user ?? null);
    this.sessionReadySubject.next(true);

    this.supabase.auth.onAuthStateChange((_, session) => {
      this.sessionSubject.next(session);
      this.userSubject.next(session?.user ?? null);
    });
  }
}
