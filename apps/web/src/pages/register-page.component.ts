import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseClientService } from '../services/supabase-client.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="min-h-screen flex items-center justify-center bg-nano-banana p-6 font-sans">
      <div class="ui-card w-full max-w-md space-y-6 p-8">
        <header class="space-y-2 text-center">
          <p class="ui-label text-[#1D1C1C]">Supabase Auth</p>
          <h1 class="text-2xl font-black font-display uppercase">Créer un compte</h1>
          <p class="text-sm text-gray-600">Enregistrez un nouvel utilisateur Supabase.</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <label class="block space-y-1 text-sm">
            <span class="ui-label">Email</span>
            <input
              formControlName="email"
              type="email"
              class="ui-input"
              placeholder="you@example.com"
            />
          </label>

          <label class="block space-y-1 text-sm">
            <span class="ui-label">Mot de passe</span>
            <input
              formControlName="password"
              type="password"
              class="ui-input"
              placeholder="••••••••"
            />
          </label>

          <p *ngIf="error()" class="text-sm text-red-600">{{ error() }}</p>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="ui-btn ui-btn-secondary w-full px-3 py-2 disabled:opacity-60"
          >
            {{ loading() ? 'Création…' : "S'inscrire" }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-600">
          Déjà un compte ?
          <a routerLink="/login" class="font-semibold underline">Se connecter</a>
        </p>
      </div>
    </section>
  `
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseClientService);

  error = signal<string | null>(null);
  loading = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit() {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.value;
    const { error } = await this.supabase.signUp(email!, password!);
    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    this.loading.set(false);
    await this.router.navigate(['/settings']);
  }
}
