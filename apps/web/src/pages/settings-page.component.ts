import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SupabaseClientService } from '../services/supabase-client.service';
import { Profile } from '../models/profile.model';
import { RealtimeSandboxComponent } from '../components/realtime-sandbox.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RealtimeSandboxComponent],
  template: `
    <section class="min-h-screen bg-slate-50">
      <header class="flex items-center justify-between px-8 py-6 border-b bg-white">
        <div class="space-y-1">
          <p class="text-xs font-semibold text-slate-500">Compte connecté</p>
          <h1 class="text-2xl font-bold">Paramètres</h1>
        </div>
        <div class="space-x-3">
          <a routerLink="/login" class="text-sm text-slate-600 underline">Changer de compte</a>
          <button (click)="signOut()" class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Se déconnecter</button>
        </div>
      </header>

      <div class="mx-auto max-w-4xl space-y-6 p-8">
        <article class="rounded-xl border bg-white p-6 shadow-sm">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase text-indigo-600">Profil Supabase</p>
              <h2 class="text-xl font-bold">Informations utilisateur</h2>
            </div>
            <a routerLink="/register" class="text-sm text-indigo-600 underline">Créer un autre compte</a>
          </header>

          <ng-container *ngIf="profile$ | async as profile; else emptyProfile">
            <dl class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <dt class="text-sm text-slate-500">ID</dt>
                <dd class="font-mono text-sm font-semibold">{{ profile.id }}</dd>
              </div>
              <div>
                <dt class="text-sm text-slate-500">Email / Username</dt>
                <dd class="font-semibold">{{ profile.username }}</dd>
              </div>
              <div>
                <dt class="text-sm text-slate-500">Avatar</dt>
                <dd class="text-sm">{{ profile.avatar_url || '—' }}</dd>
              </div>
              <div>
                <dt class="text-sm text-slate-500">Créé le</dt>
                <dd class="text-sm">{{ profile.created_at || '—' }}</dd>
              </div>
            </dl>
          </ng-container>

          <ng-template #emptyProfile>
            <p class="text-sm text-slate-600">Aucun utilisateur connecté. Retournez à la page de connexion.</p>
          </ng-template>
        </article>

        <article class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <h3 class="mb-2 text-base font-semibold">Note sécurité</h3>
          <p>
            Ne stockez jamais de clé <code>service_role</code> dans le front. Utilisez uniquement la clé <strong>anon</strong>
            côté navigateur et confiez les opérations privilégiées à des fonctions backend sécurisées.
          </p>
        </article>

        <app-realtime-sandbox></app-realtime-sandbox>
      </div>
    </section>
  `
})
export class SettingsPageComponent {
  private readonly supabase = inject(SupabaseClientService);

  profile$ = this.supabase.user$.pipe(
    map(user => {
      if (!user) return null;
      const profile: Profile = {
        id: user.id,
        username: user.email ?? 'user',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        created_at: user.created_at
      };
      return profile;
    })
  );

  async signOut() {
    await this.supabase.signOut();
  }
}
