import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-nano-banana p-4 font-sans">
      <!-- Card Container -->
      <div class="ui-card w-full max-w-md relative">
        <button
          (click)="goToRegister.emit()"
          class="ui-btn ui-btn-ghost absolute -top-12 left-0 text-sm px-3 py-1"
        >
          ← Retour
        </button>

        <!-- Header -->
        <div class="ui-card-header p-8 text-center">
          <div
            class="w-16 h-16 bg-[#1D1C1C] text-[#FFF48D] text-4xl mx-auto mb-4 flex items-center justify-center border-2 border-[#1D1C1C] wero-shadow-sm"
          >
            ♟
          </div>
          <h2 class="text-3xl font-black font-display text-[#1D1C1C] tracking-tight uppercase">
            Bon retour
          </h2>
          <p class="text-[#1D1C1C] font-medium text-sm mt-2">Prêt pour le prochain coup ?</p>
        </div>

        <!-- Form -->
        <div class="p-8 bg-white">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            @if (auth.error()) {
              <div class="p-3 bg-[#1D1C1C] text-white text-sm font-bold flex items-center wero-shadow-sm">
                <span class="mr-2">⚠️</span>
                {{ auth.error() }}
              </div>
            }

            <div>
              <label class="ui-label block mb-2 font-display">Email</label>
              <input
                type="email"
                formControlName="email"
                class="ui-input"
                placeholder="grandmaster@chess.com"
              />
            </div>

            <div>
              <div class="flex justify-between mb-2">
                <label class="ui-label font-display">Mot de passe</label>
                <button
                  type="button"
                  (click)="goToForgot.emit()"
                  class="text-xs font-bold text-gray-500 hover:text-[#1D1C1C] uppercase underline"
                >
                  Oublié ?
                </button>
              </div>
              <input
                type="password"
                formControlName="password"
                class="ui-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              [disabled]="loginForm.invalid || auth.isLoading()"
              class="ui-btn ui-btn-primary w-full py-4 text-lg font-black font-display disabled:cursor-not-allowed"
            >
              @if (auth.isLoading()) {
                CHARGEMENT...
              } @else {
                SE CONNECTER
              }
            </button>
          </form>

          <div class="ui-card-footer mt-8 pt-6 text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">Pas encore de compte ?</p>
            <button
              (click)="goToRegister.emit()"
              class="text-[#1D1C1C] font-black font-display hover:bg-[#7AF7F7] px-1 decoration-2 underline underline-offset-4"
            >
              CRÉER UN COMPTE
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  auth = inject(AuthService);
  private fb: FormBuilder = inject(FormBuilder);

  goToRegister = output<void>();
  goToForgot = output<void>();

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      await this.auth.login(email!, password!);
    }
  }
}
