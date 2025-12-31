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
    <div class="min-h-screen bg-nano-banana text-[#1D1C1C] font-sans">
      <nav class="flex items-center justify-between bg-white px-6 py-4 border-b-2 border-[#1D1C1C]">
        <div class="flex items-center space-x-3">
          <span class="ui-chip bg-[#1D1C1C] text-white">Chess Simul</span>
          <a routerLink="/login" class="text-sm font-semibold text-[#1D1C1C] hover:underline"
            >Login</a
          >
          <a routerLink="/register" class="text-sm font-semibold text-[#1D1C1C] hover:underline"
            >Register</a
          >
          <a routerLink="/settings" class="text-sm font-semibold text-[#1D1C1C] hover:underline"
            >Settings</a
          >
        </div>
        <div class="text-sm text-gray-600" *ngIf="userEmail$ | async as email; else guest">
          Connecté : <span class="font-semibold">{{ email }}</span>
        </div>
        <ng-template #guest>
          <span class="text-sm text-gray-600">Aucun utilisateur connecté</span>
        </ng-template>
      </nav>

      <router-outlet></router-outlet>
    </div>
  `
})
export class AppShellComponent {
  private readonly supabase = inject(SupabaseClientService);
  userEmail$ = this.supabase.user$.pipe(map((user) => user?.email ?? null));
}
