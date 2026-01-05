import { Injectable, signal, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  bio?: string;
  isPremium: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  twoFactorEnabled?: boolean;
  elo: number;
  isAnonymous: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private supabase = inject(SupabaseClientService);

  constructor() {
    this.supabase.session$.subscribe((session) => {
      if (session?.user) {
        void this.supabase.ensureCurrentUserProfile();
        // Map Supabase User to local User interface
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name:
            session.user.user_metadata['user_name'] ||
            session.user.email?.split('@')[0] ||
            'Unknown',
          avatar:
            session.user.user_metadata['avatar_url'] ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${session.user.id}`,
          bio: session.user.user_metadata['bio'],
          isPremium: session.user.user_metadata['is_premium'] || false,
          emailVerified:
            session.user.email_confirmed_at !== undefined &&
            session.user.email_confirmed_at !== null,
          onboardingCompleted: session.user.user_metadata['onboarding_completed'] || false,
          twoFactorEnabled: (session.user as any).two_factor_enabled || false,
          elo: 1200, // Default value, will be updated by profile fetch
          isAnonymous: session.user.is_anonymous || false
        };

        // Fetch ELO from profiles table
        this.supabase.client
          .from('profiles')
          .select('elo')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching user ELO:', error);
            } else if (data) {
              user.elo = data.elo;
            }
            this.finishAuth(user);
          });
      } else {
        this.currentUser.set(null);
        localStorage.removeItem('simul_user');
      }
    });

    // Remove the old local storage check, as session$ will handle it
    // try {
    //   const stored = localStorage.getItem('simul_user');
    //   if (stored) {
    //     this.currentUser.set(JSON.parse(stored));
    //   }
    // } catch (e) {
    //   console.error('[AuthService] Session Error:', e);
    //   localStorage.removeItem('simul_user');
    // }
  }

  async login(email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.signIn(email, password);

      if (error) {
        throw new Error(error.message);
      }
      return true;
    } catch (e: any) {
      this.error.set(e.message || 'Erreur de connexion.');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  finishAuth(user: User) {
    this.currentUser.set(user);
    localStorage.setItem('simul_user', JSON.stringify(user));
  }

  async register(name: string, email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.signUp(email, password); // Supabase signUp does not take 'name' directly

      if (error) {
        throw new Error(error.message);
      }

      // Optionally, you might want to call a Supabase function here to update the user's profile with 'name'
      // after successful registration and session creation.
      // For now, the user_metadata will be updated in the finishAuth based on session.user.user_metadata

      return true;
    } catch (e: any) {
      this.error.set(e.message);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProfile(updates: Partial<User>) {
    const current = this.currentUser();
    if (!current) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.client.auth.updateUser({
        data: {
          user_name: updates.name || current.name,
          avatar_url: updates.avatar || current.avatar,
          bio: updates.bio || current.bio
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      // The session listener in the constructor will update currentUser signal
    } catch (e: any) {
      this.error.set(e.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePassword(oldP: string, newP: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      if (newP.length < 6) throw new Error('Nouveau mot de passe trop court.');
      const { error } = await this.supabase.client.auth.updateUser({ password: newP });
      if (error) throw new Error(error.message);
      return true;
    } catch (e: any) {
      this.error.set(e.message);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggle2FA(enable: boolean) {
    this.isLoading.set(true);
    await new Promise((r) => setTimeout(r, 800));
    const user = this.currentUser();
    if (user) this.finishAuth({ ...user, twoFactorEnabled: enable });
    this.isLoading.set(false);
  }

  async upgradePremium() {
    this.isLoading.set(true);
    await new Promise((r) => setTimeout(r, 1500)); // Payment processing
    const user = this.currentUser();
    if (user) this.finishAuth({ ...user, isPremium: true });
    this.isLoading.set(false);
  }

  async verifyEmail(code: string): Promise<boolean> {
    this.isLoading.set(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (code !== '1234') throw new Error('Code invalide (Essayez 1234)');

      const user = this.currentUser();
      if (user) {
        this.finishAuth({ ...user, emailVerified: true });
      }
      return true;
    } catch (e: any) {
      this.error.set(e.message);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async completeOnboarding(updates: { avatar: string; name: string }): Promise<boolean> {
    this.isLoading.set(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const user = this.currentUser();
      if (user) {
        this.finishAuth({ ...user, ...updates, onboardingCompleted: true });
      }
      return true;
    } finally {
      this.isLoading.set(false);
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      if (!email.includes('@')) throw new Error('Email invalide');
      const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password'
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (e: any) {
      this.error.set(e.message);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOut() {
    await this.logout();
  }

  async logout() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { error } = await this.supabase.signOut();
      if (error) {
        throw new Error(error.message || 'Erreur de déconnexion.');
      }
    } catch (e: any) {
      this.error.set(e.message || 'Erreur de déconnexion.');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateElo(newElo: number) {
    const user = this.currentUser();
    if (user) {
      this.finishAuth({ ...user, elo: Math.round(newElo) });
    }
  }
}
