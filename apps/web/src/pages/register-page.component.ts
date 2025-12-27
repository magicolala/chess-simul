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
    <section class="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div class="w-full max-w-md space-y-6 bg-white border rounded-xl shadow-sm p-8">
        <header class="space-y-2 text-center">
          <p class="text-xs font-semibold text-emerald-600">Supabase Auth</p>
          <h1 class="text-2xl font-bold">Créer un compte</h1>
          <p class="text-sm text-slate-600">Enregistrez un nouvel utilisateur Supabase.</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <label class="block space-y-1 text-sm">
            <span class="font-semibold">Email</span>
            <input formControlName="email" type="email" class="w-full rounded-md border px-3 py-2" placeholder="you@example.com" />
          </label>

          <label class="block space-y-1 text-sm">
            <span class="font-semibold">Mot de passe</span>
            <input formControlName="password" type="password" class="w-full rounded-md border px-3 py-2" placeholder="••••••••" />
          </label>

          <p *ngIf="error()" class="text-sm text-red-600">{{ error() }}</p>

          <button type="submit" [disabled]="form.invalid || loading()" class="w-full rounded-md bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-60">
            {{ loading() ? 'Création…' : "S'inscrire" }}
          </button>
        </form>

        <p class="text-center text-sm text-slate-600">
          Déjà un compte ?
          <a routerLink="/login" class="font-semibold text-emerald-600">Se connecter</a>
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
    if (this.form.invalid) return;
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
