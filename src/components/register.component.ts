
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
      <div class="w-full max-w-md bg-white border-2 border-[#1D1C1C] wero-shadow relative">
        <button (click)="goToLogin.emit()" class="absolute -top-12 left-0 text-sm font-bold bg-white px-3 py-1 border-2 border-[#1D1C1C] hover:bg-[#FFF48D]">← Retour</button>

        <!-- Header -->
        <div class="bg-white p-8 pb-4 text-center">
           <h2 class="text-3xl font-black font-display text-[#1D1C1C] tracking-tight uppercase">Rejoignez-nous</h2>
           <p class="text-gray-500 text-sm mt-1 font-medium">Devenez une légende</p>
        </div>

        <!-- Form -->
        <div class="p-8 pt-4">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
            
             @if (auth.error()) {
              <div class="p-3 bg-[#1D1C1C] text-white text-sm font-bold flex items-center wero-shadow-sm">
                {{ auth.error() }}
              </div>
            }

            <div>
              <label class="block text-sm font-bold font-display text-[#1D1C1C] mb-2 uppercase tracking-wide">Nom d'utilisateur</label>
              <input type="text" formControlName="name"
                class="w-full px-4 py-3 border-2 border-[#1D1C1C] bg-white focus:bg-[#7AF7F7] focus:outline-none transition-colors rounded-none placeholder-gray-400 font-medium">
            </div>

            <div>
              <label class="block text-sm font-bold font-display text-[#1D1C1C] mb-2 uppercase tracking-wide">Email</label>
              <input type="email" formControlName="email"
                class="w-full px-4 py-3 border-2 border-[#1D1C1C] bg-white focus:bg-[#7AF7F7] focus:outline-none transition-colors rounded-none placeholder-gray-400 font-medium">
            </div>

            <div>
              <label class="block text-sm font-bold font-display text-[#1D1C1C] mb-2 uppercase tracking-wide">Mot de passe</label>
              <input type="password" formControlName="password"
                class="w-full px-4 py-3 border-2 border-[#1D1C1C] bg-white focus:bg-[#7AF7F7] focus:outline-none transition-colors rounded-none placeholder-gray-400 font-medium">
            </div>

            <button type="submit" 
              [disabled]="registerForm.invalid || auth.isLoading()"
              class="w-full py-4 bg-[#7AF7F7] hover:bg-[#FFF48D] text-[#1D1C1C] text-lg font-black font-display border-2 border-[#1D1C1C] wero-shadow-sm wero-shadow-hover transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-4 disabled:opacity-50">
              @if (auth.isLoading()) {
                CRÉATION...
              } @else {
                COMMENCER
              }
            </button>
          </form>

          <div class="mt-8 pt-6 border-t-2 border-[#1D1C1C] text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">Déjà un compte ?</p>
            <button (click)="goToLogin.emit()" class="text-[#1D1C1C] font-black font-display hover:bg-[#FFF48D] px-1 decoration-2 underline underline-offset-4">
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
