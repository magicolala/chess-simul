
import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-nano-banana p-4 font-sans">
      <div class="w-full max-w-md bg-white border-2 border-[#1D1C1C] wero-shadow relative p-8">
        <button (click)="back.emit()" class="absolute -top-12 left-0 text-sm font-bold bg-white px-3 py-1 border-2 border-[#1D1C1C] hover:bg-[#FFF48D]">← Retour</button>

        <div class="text-center mb-6">
           <h2 class="text-2xl font-black font-display text-[#1D1C1C] uppercase mb-2">Mot de passe oublié ?</h2>
           <p class="text-gray-600 text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</p>
        </div>

        @if (isSent()) {
            <div class="bg-green-100 border border-green-500 text-green-800 p-4 rounded-[2px] mb-4 text-center">
                <p class="font-bold">Email envoyé !</p>
                <p class="text-xs mt-1">Vérifiez votre boîte de réception.</p>
            </div>
            <button (click)="back.emit()" class="w-full py-3 bg-[#1D1C1C] text-white font-bold uppercase border-2 border-[#1D1C1C]">Retour à la connexion</button>
        } @else {
            <div class="space-y-4">
                <input type="email" [(ngModel)]="email" placeholder="votre@email.com" class="w-full px-4 py-3 border-2 border-[#1D1C1C] font-medium outline-none focus:bg-gray-50">
                
                @if (auth.error()) {
                   <p class="text-red-600 text-xs font-bold">{{ auth.error() }}</p>
                }

                <button (click)="submit()" [disabled]="auth.isLoading() || !email()" 
                    class="w-full py-4 bg-[#FFF48D] text-[#1D1C1C] text-lg font-black font-display uppercase border-2 border-[#1D1C1C] wero-shadow-sm hover:bg-[#7AF7F7] disabled:opacity-50">
                    {{ auth.isLoading() ? 'Envoi...' : 'Réinitialiser' }}
                </button>
            </div>
        }
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  auth = inject(AuthService);
  back = output<void>();
  
  email = signal('');
  isSent = signal(false);

  async submit() {
      const success = await this.auth.resetPassword(this.email());
      if (success) {
          this.isSent.set(true);
      }
  }
}
