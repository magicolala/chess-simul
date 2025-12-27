
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
      <div class="w-full max-w-md bg-white border-2 border-[#1D1C1C] wero-shadow relative">
        <button (click)="goToRegister.emit()" class="absolute -top-12 left-0 text-sm font-bold bg-white px-3 py-1 border-2 border-[#1D1C1C] hover:bg-[#FFF48D]">← Retour</button>

        <!-- Header -->
        <div class="bg-[#FFF48D] p-8 text-center border-b-2 border-[#1D1C1C]">
           <div class="w-16 h-16 bg-[#1D1C1C] text-[#FFF48D] text-4xl mx-auto mb-4 flex items-center justify-center border-2 border-[#1D1C1C] wero-shadow-sm">
             ♟
           </div>
           <h2 class="text-3xl font-black font-display text-[#1D1C1C] tracking-tight uppercase">Bon retour</h2>
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
              <label class="block text-sm font-bold font-display text-[#1D1C1C] mb-2 uppercase tracking-wide">Email</label>
              <input type="email" formControlName="email" 
                class="w-full px-4 py-3 border-2 border-[#1D1C1C] bg-white focus:bg-[#7AF7F7] focus:outline-none transition-colors rounded-none placeholder-gray-400 font-medium"
                placeholder="grandmaster@chess.com">
            </div>

            <div>
              <label class="block text-sm font-bold font-display text-[#1D1C1C] mb-2 uppercase tracking-wide">Mot de passe</label>
              <input type="password" formControlName="password"
                class="w-full px-4 py-3 border-2 border-[#1D1C1C] bg-white focus:bg-[#7AF7F7] focus:outline-none transition-colors rounded-none placeholder-gray-400 font-medium"
                placeholder="••••••••">
            </div>

            <button type="submit" 
              [disabled]="loginForm.invalid || auth.isLoading()"
              class="w-full py-4 bg-[#FFF48D] hover:bg-[#7AF7F7] text-[#1D1C1C] text-lg font-black font-display border-2 border-[#1D1C1C] wero-shadow-sm wero-shadow-hover transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
              @if (auth.isLoading()) {
                CHARGEMENT...
              } @else {
                SE CONNECTER
              }
            </button>
          </form>

          <div class="mt-8 pt-6 border-t-2 border-[#1D1C1C] text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">Pas encore de compte ?</p>
            <button (click)="goToRegister.emit()" class="text-[#1D1C1C] font-black font-display hover:bg-[#7AF7F7] px-1 decoration-2 underline underline-offset-4">
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
