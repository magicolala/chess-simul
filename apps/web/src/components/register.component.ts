import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-nano-banana p-4 font-sans">
      <div class="ui-card w-full max-w-md relative">
        <button
          (click)="goToLogin.emit()"
          class="ui-btn ui-btn-ghost absolute -top-12 left-0 text-sm px-3 py-1"
        >
          ← Retour
        </button>

        <!-- Header -->
        <div class="ui-card-header p-8 text-center">
          <div
            class="w-16 h-16 bg-[#1D1C1C] text-[#FFF48D] text-4xl mx-auto mb-4 flex items-center justify-center border-2 border-[#1D1C1C] wero-shadow-sm"
          >
            ♞
          </div>
          <h2 class="text-3xl font-black font-display text-[#1D1C1C] tracking-tight uppercase">
            Rejoignez-nous
          </h2>
          <p class="text-[#1D1C1C] text-sm mt-1 font-medium">Devenez une légende</p>
        </div>

        <!-- Form -->
        <div class="p-8 pt-4">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
            @if (auth.error()) {
              <div
                class="p-3 bg-[#1D1C1C] text-white text-sm font-bold flex items-center wero-shadow-sm"
              >
                {{ auth.error() }}
              </div>
            }

            <div>
              <label class="ui-label block mb-2 font-display">Nom d'utilisateur</label>
              <input type="text" formControlName="name" class="ui-input" />
            </div>

            <div>
              <label class="ui-label block mb-2 font-display">Email</label>
              <input type="email" formControlName="email" class="ui-input" />
            </div>

            <div>
              <label class="ui-label block mb-2 font-display">Mot de passe</label>
              <input type="password" formControlName="password" class="ui-input" />
            </div>

            <button
              type="submit"
              [disabled]="registerForm.invalid || auth.isLoading()"
              class="ui-btn ui-btn-secondary w-full py-4 text-lg font-black font-display mt-4"
            >
              @if (auth.isLoading()) {
                CRÉATION...
              } @else {
                COMMENCER
              }
            </button>
          </form>

          <div class="ui-card-footer mt-8 pt-6 text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">Déjà un compte ?</p>
            <button
              (click)="goToLogin.emit()"
              class="text-[#1D1C1C] font-black font-display hover:bg-[#FFF48D] px-1 decoration-2 underline underline-offset-4"
            >
              SE CONNECTER
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  auth = inject(AuthService);
  private fb: FormBuilder = inject(FormBuilder);

  goToLogin = output<void>();

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit() {
    if (this.registerForm.valid) {
      const { name, email, password } = this.registerForm.value;
      await this.auth.register(name!, email!, password!);
    }
  }
}
