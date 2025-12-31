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

        <div class="ui-card max-w-5xl relative z-10 animate-in fade-in zoom-in duration-700 bg-white/80 p-10 md:p-14 backdrop-blur-sm space-y-8">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <span class="inline-block py-1 px-3 bg-[#E0F7FA] text-[#006064] border border-[#006064] text-xs font-black font-display uppercase tracking-widest rounded-full">
              Multijoueur Premium
            </span>
            <div class="flex items-center justify-center gap-3 text-sm font-bold font-display uppercase text-gray-600">
              <span class="inline-flex items-center gap-2 px-3 py-1 border-2 border-[#1D1C1C] bg-[#FFF48D]">⚡ Temps réel</span>
              <span class="inline-flex items-center gap-2 px-3 py-1 border-2 border-[#1D1C1C] bg-white">♙ 0 bots, 100% humain</span>
            </div>
          </div>

          <h1 class="text-5xl md:text-7xl font-black font-display tracking-tighter leading-[0.95]">
            L'ÉCHECS <br>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#1D1C1C] to-gray-500">ENTRE AMIS.</span>
          </h1>
          <p class="text-xl md:text-2xl text-gray-700 font-medium max-w-3xl mx-auto leading-relaxed font-sans">
            Parties rapides, simultanées et analyses visuelles. Lancez un duel en 10 secondes, partagez le lien et reprenez vos
            meilleurs coups depuis n'importe quel appareil.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
            <div class="ui-card p-5 bg-white/90">
              <p class="text-sm font-bold font-display uppercase tracking-wide text-gray-500 mb-2">Pour les clubs</p>
              <p class="text-lg font-black font-display leading-tight">Organisez des simultanées pro et suivez chaque table.</p>
            </div>
            <div class="ui-card p-5 bg-white/90">
              <p class="text-sm font-bold font-display uppercase tracking-wide text-gray-500 mb-2">Pour les amis</p>
              <p class="text-lg font-black font-display leading-tight">Invitations instantanées, pas besoin de créer un lobby.</p>
            </div>
            <div class="ui-card p-5 bg-white/90">
              <p class="text-sm font-bold font-display uppercase tracking-wide text-gray-500 mb-2">Pour progresser</p>
              <p class="text-lg font-black font-display leading-tight">Export PGN, reprise de parties et mode analyse dédié.</p>
            </div>
          </div>

          <div class="flex flex-col md:flex-row items-center justify-center md:justify-between gap-6">
            <div class="flex flex-col md:flex-row items-center gap-6">
              <button (click)="goToRegister.emit()" class="ui-btn ui-btn-secondary w-full md:w-auto px-10 py-5 text-xl font-black font-display">
                Commencer Gratuitement
              </button>
              <button (click)="goToLogin.emit()" class="ui-btn ui-btn-ghost w-full md:w-auto px-10 py-5 text-xl font-black font-display">
                J'ai un compte
              </button>
            </div>
            <div class="flex items-center gap-6 text-left">
              <div>
                <p class="text-3xl font-black font-display leading-none"><span class="text-4xl">3</span> modes</p>
                <p class="text-xs font-bold uppercase tracking-widest text-gray-500">Duel · Simultanée · Analyse</p>
              </div>
              <div class="w-px h-12 bg-gray-300"></div>
              <div>
                <p class="text-3xl font-black font-display leading-none"><span class="text-4xl">10s</span></p>
                <p class="text-xs font-bold uppercase tracking-widest text-gray-500">Pour démarrer une partie</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Selling Points -->
      <section class="py-16 bg-white border-t-2 border-[#1D1C1C]">
        <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div class="lg:col-span-1 space-y-4">
            <p class="text-sm font-black font-display uppercase tracking-[0.2em] text-gray-500">Conçu pour jouer</p>
            <h2 class="text-4xl font-black font-display leading-tight">Une plateforme pensée pour la compétition amicale.</h2>
            <p class="text-gray-600 font-medium">Accédez à une interface néo-brutaliste, des animations soignées et un suivi clair des coups. Le tout en français.</p>
            <div class="flex items-center gap-4">
              <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FFF48D] border-2 border-[#1D1C1C] font-bold">☑</span>
              <p class="font-bold">Pas de pub, pas de distraction. Juste du jeu.</p>
            </div>
          </div>

          <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="ui-card p-6 space-y-3 bg-[#FFF48D]/30 border-dashed border-2 border-[#1D1C1C]">
              <div class="flex items-center justify-between">
                <h3 class="text-2xl font-black font-display uppercase">Simultanées</h3>
                <span class="text-sm font-bold px-3 py-1 border-2 border-[#1D1C1C] bg-white">Jusqu'à 12 tables</span>
              </div>
              <p class="text-gray-700 font-medium">Le maestro passe de table en table, les joueurs voient l'avancée en temps réel. Idéal pour les clubs et les streams.</p>
              <ul class="space-y-2 text-sm font-bold text-gray-700">
                <li class="flex items-center gap-2">✅ Tableau de bord des parties</li>
                <li class="flex items-center gap-2">✅ Chat intégré et rappels de coups</li>
                <li class="flex items-center gap-2">✅ Export complet après la session</li>
              </ul>
            </div>

            <div class="ui-card p-6 space-y-3 bg-white/80">
              <div class="flex items-center justify-between">
                <h3 class="text-2xl font-black font-display uppercase">Multijoueur</h3>
                <span class="text-sm font-bold px-3 py-1 border-2 border-[#1D1C1C] bg-[#7AF7F7]">Lien magique</span>
              </div>
              <p class="text-gray-700 font-medium">Envoyez un lien, la partie s'ouvre directement. Vous choisissez le temps, la couleur et l'orientation.</p>
              <div class="grid grid-cols-2 gap-4 text-sm font-bold text-gray-800">
                <div class="p-4 border-2 border-[#1D1C1C] bg-[#FFF48D]/60">Bullet, Blitz, Classic</div>
                <div class="p-4 border-2 border-[#1D1C1C] bg-white">Historique illimité</div>
                <div class="p-4 border-2 border-[#1D1C1C] bg-white">Mode focus</div>
                <div class="p-4 border-2 border-[#1D1C1C] bg-[#FFF48D]/60">Reprise de partie</div>
              </div>
            </div>

            <div class="ui-card p-6 space-y-3 bg-white/80">
              <div class="flex items-center justify-between">
                <h3 class="text-2xl font-black font-display uppercase">Analyse</h3>
                <span class="text-sm font-bold px-3 py-1 border-2 border-[#1D1C1C] bg-white">PGN & Lichess</span>
              </div>
              <p class="text-gray-700 font-medium">Rejouez vos parties, marquez vos coups clés et exportez tout en un clic. Les positions sont prêtes pour Stockfish.</p>
              <div class="flex items-center gap-3 text-sm font-bold text-gray-800">
                <span class="px-3 py-2 border-2 border-[#1D1C1C] bg-[#7AF7F7]/60">Repères visuels</span>
                <span class="px-3 py-2 border-2 border-[#1D1C1C] bg-white">Positions critiques</span>
                <span class="px-3 py-2 border-2 border-[#1D1C1C] bg-[#FFF48D]/60">Plan de jeu</span>
              </div>
            </div>

            <div class="ui-card p-6 space-y-3 bg-[#1D1C1C] text-white border-4 border-[#FFF48D]">
              <div class="flex items-center justify-between">
                <h3 class="text-2xl font-black font-display uppercase">Toujours prêt</h3>
                <span class="text-sm font-bold px-3 py-1 border border-white">Mode sombre</span>
              </div>
              <p class="text-gray-100 font-medium">Interface responsive, optimisée mobile. Les animations restent fluides, même lors des simultanées.</p>
              <div class="flex items-center gap-4">
                <div class="text-3xl">📱</div>
                <p class="font-black font-display leading-tight">Accessible sur tablette et smartphone sans installer quoi que ce soit.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Community & Social Proof -->
      <section class="py-16 bg-nano-banana border-t-2 border-[#1D1C1C]">
        <div class="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-10">
          <div class="flex-1 space-y-4">
            <p class="text-sm font-black font-display uppercase tracking-[0.25em] text-gray-600">Communauté</p>
            <h3 class="text-4xl font-black font-display leading-tight">Rejoignez les joueurs qui aiment le beau jeu.</h3>
            <p class="text-gray-700 font-medium">Un lobby social, des profils publics et un historique clair pour challenger vos amis encore et encore.</p>
            <div class="flex items-center gap-6">
              <div>
                <p class="text-4xl font-black font-display leading-none">98%</p>
                <p class="text-xs font-bold uppercase tracking-widest text-gray-600">Des joueurs veulent revenir</p>
              </div>
              <div class="w-px h-14 bg-[#1D1C1C]"></div>
              <div>
                <p class="text-4xl font-black font-display leading-none">4.8★</p>
                <p class="text-xs font-bold uppercase tracking-widest text-gray-600">Note moyenne des parties privées</p>
              </div>
            </div>
          </div>

          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <div class="ui-card p-6 bg-white/90 border-2 border-[#1D1C1C]">
              <p class="text-sm font-bold uppercase text-gray-500 mb-3">Clubs</p>
              <p class="font-black text-lg leading-tight">« Les simultanées sont super lisibles, on voit immédiatement où jouer ensuite. »</p>
              <p class="text-sm font-bold text-gray-600 mt-4">Yacine · Président de club</p>
            </div>
            <div class="ui-card p-6 bg-[#FFF48D]/80 border-2 border-[#1D1C1C]">
              <p class="text-sm font-bold uppercase text-gray-700 mb-3">Amis</p>
              <p class="font-black text-lg leading-tight">« On s'envoie un lien et on joue sur mobile. L'historique est nickel pour se vanner après. »</p>
              <p class="text-sm font-bold text-gray-700 mt-4">Awa · Paris</p>
            </div>
            <div class="ui-card p-6 bg-white/90 border-2 border-[#1D1C1C] sm:col-span-2">
              <p class="text-sm font-bold uppercase text-gray-500 mb-3">Créateurs</p>
              <p class="font-black text-lg leading-tight">« La DA néo-brutaliste fait la diff en stream, et la reprise de parties marche très bien entre deux lives. »</p>
              <p class="text-sm font-bold text-gray-600 mt-4">Kenji · Streamer</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="py-12 bg-[#1D1C1C] text-white border-t-2 border-[#1D1C1C]">
        <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p class="text-sm font-black font-display uppercase tracking-[0.3em] text-[#FFF48D]">Prêt à jouer</p>
            <h4 class="text-3xl md:text-4xl font-black font-display leading-tight">Créez une partie privée en moins de 10 secondes.</h4>
            <p class="text-gray-200 font-medium mt-2">Aucune carte bancaire demandée. Votre progression reste disponible partout.</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button (click)="goToRegister.emit()" class="ui-btn ui-btn-secondary w-full sm:w-auto px-8 py-4 text-lg font-black font-display">
              Commencer Gratuitement
            </button>
            <button (click)="goToLogin.emit()" class="ui-btn ui-btn-ghost border-2 border-white text-white hover:bg-white hover:text-[#1D1C1C] w-full sm:w-auto px-8 py-4 text-lg font-black font-display">
              Me connecter
            </button>
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