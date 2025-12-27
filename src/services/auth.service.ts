
import { Injectable, signal } from '@angular/core';

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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    try {
      const stored = localStorage.getItem('simul_user');
      if (stored) {
        this.currentUser.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('[AuthService] Session Error:', e);
      localStorage.removeItem('simul_user');
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!email || !password) throw new Error("Veuillez remplir tous les champs.");
      if (password.length < 6) throw new Error("Mot de passe incorrect (min 6 chars).");

      // Mock User
      const user: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${email}`,
        bio: 'Joueur passionné.',
        isPremium: false,
        emailVerified: true,
        onboardingCompleted: true,
        twoFactorEnabled: false
      };
      
      this.finishAuth(user);
      return true;

    } catch (e: any) {
      this.error.set(e.message || "Erreur de connexion.");
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async register(name: string, email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (!name || !email || !password) throw new Error("Champs manquants.");
      if (password.length < 6) throw new Error("Le mot de passe est trop court.");
      
      // Mock Duplicate Check
      if (name.toLowerCase() === 'admin') throw new Error("Ce pseudo est déjà pris.");

      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`,
        isPremium: false,
        emailVerified: false,
        onboardingCompleted: false
      };
      
      this.finishAuth(user);
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
      
      // Simuler API
      await new Promise(r => setTimeout(r, 500));
      
      const updated = { ...current, ...updates };
      this.finishAuth(updated);
  }

  async changePassword(oldP: string, newP: string): Promise<boolean> {
      this.isLoading.set(true);
      try {
          await new Promise(r => setTimeout(r, 1000));
          if (newP.length < 6) throw new Error("Nouveau mot de passe trop court.");
          return true;
      } catch(e: any) {
          this.error.set(e.message);
          return false;
      } finally {
          this.isLoading.set(false);
      }
  }

  async toggle2FA(enable: boolean) {
      this.isLoading.set(true);
      await new Promise(r => setTimeout(r, 800));
      const user = this.currentUser();
      if(user) this.finishAuth({ ...user, twoFactorEnabled: enable });
      this.isLoading.set(false);
  }

  async upgradePremium() {
      this.isLoading.set(true);
      await new Promise(r => setTimeout(r, 1500)); // Payment processing
      const user = this.currentUser();
      if(user) this.finishAuth({ ...user, isPremium: true });
      this.isLoading.set(false);
  }

  async verifyEmail(code: string): Promise<boolean> {
    this.isLoading.set(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (code !== '1234') throw new Error("Code invalide (Essayez 1234)");
        
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

  async completeOnboarding(updates: { avatar: string, name: string }): Promise<boolean> {
      this.isLoading.set(true);
      try {
          await new Promise(resolve => setTimeout(resolve, 800));
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
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!email.includes('@')) throw new Error("Email invalide");
          return true;
      } catch(e: any) {
          this.error.set(e.message);
          return false;
      } finally {
          this.isLoading.set(false);
      }
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('simul_user');
    this.error.set(null);
  }

  private finishAuth(user: User) {
    this.currentUser.set(user);
    localStorage.setItem('simul_user', JSON.stringify(user));
  }
}
