
import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-nano-banana text-[#1D1C1C] font-sans flex flex-col">
      
      <!-- Navbar -->
      <nav class="flex items-center justify-between px-6 py-6 border-b-2 border-[#1D1C1C] sticky top-0 bg-white/95 backdrop-blur-sm z-50">
         <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-[#FFF48D] text-[#1D1C1C] flex items-center justify-center border-2 border-[#1D1C1C] wero-shadow-sm text-2xl">
              ♟
            </div>
            <h1 class="text-xl font-black font-display tracking-tighter uppercase hidden md:block">Chess Master</h1>
         </div>
         <div class="flex items-center space-x-4">
            <button (click)="goToLogin.emit()" class="ui-btn ui-btn-ghost text-sm px-3 py-1">Connexion</button>
            <button (click)="goToRegister.emit()" class="ui-btn ui-btn-dark px-6 py-2 font-black font-display">
               Rejoindre
            </button>
         </div>
      </nav>

      <!-- Hero Section -->
      <header class="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
         <!-- Decorative Background Elements -->
         <div class="absolute top-20 left-10 text-9xl opacity-5 pointer-events-none rotate-12 font-display">♟</div>
         <div class="absolute bottom-20 right-10 text-9xl opacity-5 pointer-events-none -rotate-12 font-display">♞</div>

         <div class="ui-card max-w-4xl relative z-10 animate-in fade-in zoom-in duration-700 bg-white/80 p-8 backdrop-blur-sm">
            <span class="inline-block py-1 px-3 bg-[#E0F7FA] text-[#006064] border border-[#006064] text-xs font-black font-display uppercase tracking-widest rounded-full mb-6">
               Multijoueur Premium
            </span>
            <h1 class="text-6xl md:text-8xl font-black font-display tracking-tighter mb-6 leading-[0.9]">
               L'ÉCHECS <br>
               <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#1D1C1C] to-gray-500">ENTRE AMIS.</span>
            </h1>
            <p class="text-xl md:text-2xl text-gray-600 font-medium max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
               Défiez vos amis en local ou préparez-vous pour le mode en ligne. Une expérience visuelle épurée et intense.
            </p>
            
            <div class="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
               <button (click)="goToRegister.emit()" class="ui-btn ui-btn-secondary w-full md:w-auto px-10 py-5 text-xl font-black font-display">
                  Commencer Gratuitement
               </button>
               <button (click)="goToLogin.emit()" class="ui-btn ui-btn-ghost w-full md:w-auto px-10 py-5 text-xl font-black font-display">
                  J'ai un compte
               </button>
            </div>
         </div>
      </header>

      <!-- Features Grid -->
      <section class="py-20 bg-white border-t-2 border-[#1D1C1C]">
         <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <!-- Card 1 -->
            <div class="ui-card p-8 hover:wero-shadow-hover transition-all">
               <div class="w-16 h-16 bg-[#FFF48D] border-2 border-[#1D1C1C] flex items-center justify-center text-3xl mb-6 rounded-full">
                  🤝
               </div>
               <h3 class="text-2xl font-black font-display uppercase mb-3">Pass & Play</h3>
               <p class="text-gray-600 font-medium font-sans">Jouez contre un ami sur le même appareil avec une interface fluide et réactive.</p>
            </div>

            <!-- Card 2 -->
            <div class="ui-card p-8 hover:wero-shadow-hover transition-all">
               <div class="w-16 h-16 bg-[#7AF7F7] border-2 border-[#1D1C1C] flex items-center justify-center text-3xl mb-6 rounded-full">
                  ⚡
               </div>
               <h3 class="text-2xl font-black font-display uppercase mb-3">Rapidité</h3>
               <p class="text-gray-600 font-medium font-sans">Optimisé pour la performance. Pas de latence, juste du pur jeu d'échecs.</p>
            </div>

            <!-- Card 3 -->
            <div class="ui-card p-8 hover:wero-shadow-hover transition-all">
               <div class="w-16 h-16 bg-[#1D1C1C] text-white border-2 border-[#1D1C1C] flex items-center justify-center text-3xl mb-6 rounded-full">
                  📈
               </div>
               <h3 class="text-2xl font-black font-display uppercase mb-3">Analyses</h3>
               <p class="text-gray-600 font-medium font-sans">Exportez vos parties en PGN ou analysez directement sur Lichess.</p>
            </div>

         </div>
      </section>

      <!-- Footer -->
      <footer class="bg-[#1D1C1C] text-white py-12 border-t-2 border-[#1D1C1C]">
         <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div class="flex items-center space-x-3 mb-4 md:mb-0">
               <div class="w-8 h-8 bg-[#FFF48D] text-[#1D1C1C] flex items-center justify-center border border-white font-bold">
                 ♟
               </div>
               <span class="font-black font-display tracking-tight text-lg">CHESS MASTER</span>
            </div>
            <p class="text-gray-400 text-sm font-medium font-sans">© 2024 Chess Master. Design Néo-Brutaliste.</p>
         </div>
      </footer>

    </div>
  `
})
export class LandingComponent {
  goToLogin = output<void>();
  goToRegister = output<void>();
}
