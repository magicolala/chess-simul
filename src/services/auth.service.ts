
import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signal pour l'état de l'utilisateur
  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    try {
      // Vérifier s'il y a une session (simulé)
      const stored = localStorage.getItem('simul_user');
      if (stored) {
        this.currentUser.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('[AuthService] Erreur lors de la récupération de la session:', e);
      localStorage.removeItem('simul_user');
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Simulation délai réseau
      await new Promise(resolve => setTimeout(resolve, 800));

      // Validation de base
      if (!email || !password) {
        throw new Error("Veuillez remplir tous les champs.");
      }

      if (!email.includes('@')) {
        throw new Error("Format d'email invalide.");
      }

      if (password.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      }

      // Simulation de validation (succès)
      const user: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${email}`
      };
      
      this.finishAuth(user);
      return true;

    } catch (e: any) {
      console.error('[AuthService] Login Error:', e);
      this.error.set(e.message || "Une erreur inattendue est survenue lors de la connexion.");
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async register(name: string, email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Simulation délai réseau
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (!name || !email || !password) {
        throw new Error("Veuillez remplir tous les champs.");
      }

      if (password.length < 6) {
        throw new Error("Le mot de passe est trop court.");
      }

      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`
      };
      
      this.finishAuth(user);
      return true;

    } catch (e: any) {
      console.error('[AuthService] Register Error:', e);
      this.error.set(e.message || "Impossible de créer le compte. Veuillez réessayer.");
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  updateAvatar(seed: string) {
    try {
      const user = this.currentUser();
      if (user) {
          const updatedUser = { ...user, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}` };
          this.finishAuth(updatedUser);
      }
    } catch (e) {
      console.error('[AuthService] Avatar Update Error:', e);
      this.error.set("Erreur lors de la mise à jour de l'avatar.");
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
