
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-nano-banana p-4 font-sans">
      <div class="ui-card w-full max-w-md relative p-8">
         
         <div class="text-center mb-8">
            <div class="w-16 h-16 bg-[#FFF48D] border-2 border-[#1D1C1C] flex items-center justify-center text-3xl mx-auto mb-4 wero-shadow-sm">
                ✉️
            </div>
            <h2 class="text-2xl font-black font-display text-[#1D1C1C] uppercase mb-2">Vérifiez votre email</h2>
            <p class="text-gray-600 text-sm">
                Un code a été envoyé à <strong>{{ auth.currentUser()?.email }}</strong>.
                <br> (Pour la démo, utilisez le code : <strong>1234</strong>)
            </p>
         </div>

         @if (auth.error()) {
            <div class="p-3 mb-4 bg-red-100 border border-red-500 text-red-700 text-sm font-bold flex items-center rounded-[2px]">
              {{ auth.error() }}
            </div>
         }

         <div class="space-y-4">
            <input type="text" [(ngModel)]="code" placeholder="Entrez le code" class="ui-input text-center text-2xl tracking-widest font-mono font-bold uppercase">
            
            <button (click)="verify()" [disabled]="auth.isLoading() || code().length < 4" 
                class="ui-btn ui-btn-dark w-full py-4 text-lg font-black font-display">
                {{ auth.isLoading() ? 'Vérification...' : 'Confirmer' }}
            </button>
            
            <button (click)="auth.logout()" class="w-full text-xs font-bold text-gray-400 hover:text-[#1D1C1C] uppercase">
                Changer de compte
            </button>
         </div>
      </div>
    </div>
  `
})
export class VerifyEmailComponent {
  auth = inject(AuthService);
  code = signal('');

  async verify() {
      await this.auth.verifyEmail(this.code());
  }
}
