import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { SupabaseClientService } from './services/supabase-client.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <nav class="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div class="flex items-center space-x-3">
          <span class="rounded-md bg-slate-900 px-2 py-1 text-sm font-semibold text-white">Chess Simul</span>
          <a routerLink="/login" class="text-sm font-semibold text-slate-700">Login</a>
          <a routerLink="/register" class="text-sm font-semibold text-slate-700">Register</a>
          <a routerLink="/settings" class="text-sm font-semibold text-slate-700">Settings</a>
        </div>
        <div class="text-sm text-slate-600" *ngIf="userEmail$ | async as email; else guest">
          Connecté : <span class="font-semibold">{{ email }}</span>
        </div>
        <ng-template #guest>
          <span class="text-sm text-slate-600">Aucun utilisateur connecté</span>
        </ng-template>
      </nav>

      <router-outlet></router-outlet>
    </div>
  `
})
export class AppShellComponent {
  private readonly supabase = inject(SupabaseClientService);
  userEmail$ = this.supabase.user$.pipe(map(user => user?.email ?? null));
}
