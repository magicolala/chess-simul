import { Component, inject, signal, type OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormsModule } from '@angular/forms';
import { PreferencesService, BOARD_THEMES, type GameSettings, type NotificationSettings, type PrivacySettings } from '../services/preferences.service';
import { AuthService } from '../services/auth.service';

type SettingsTab =
  | 'profile'
  | 'security'
  | 'appearance'
  | 'game'
  | 'notifications'
  | 'privacy'
  | 'premium';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div
      class="flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-[#1D1C1C] dark:text-white font-['Inter'] transition-colors duration-300"
    >
      <!-- Header -->
      <div
        class="flex-shrink-0 p-6 border-b-2 border-[#1D1C1C] dark:border-white flex items-center justify-between bg-white dark:bg-[#1a1a1a] z-10"
      >
        <h2 class="text-3xl font-black flex items-center uppercase tracking-tighter">
          <span
            class="mr-3 bg-[#FFF48D] w-10 h-10 flex items-center justify-center border-2 border-[#1D1C1C] text-[#1D1C1C] text-xl"
            >⚙️</span
          >
          Paramètres
        </h2>
        <button
          (click)="close.emit()"
          class="w-10 h-10 flex items-center justify-center border-2 border-transparent hover:border-[#1D1C1C] dark:hover:border-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-[2px] text-2xl font-bold leading-none"
        >
          ×
        </button>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside
          class="w-64 border-r-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#121212] flex-shrink-0 overflow-y-auto hidden md:block"
        >
          <nav class="p-4 space-y-2">
            <button
              (click)="currentTab.set('profile')"
              [class.active-tab]="currentTab() === 'profile'"
              class="tab-btn"
            >
              👤 Profil
            </button>
            <button
              (click)="currentTab.set('security')"
              [class.active-tab]="currentTab() === 'security'"
              class="tab-btn"
            >
              🔒 Sécurité
            </button>
            <button
              (click)="currentTab.set('appearance')"
              [class.active-tab]="currentTab() === 'appearance'"
              class="tab-btn"
            >
              🎨 Apparence
            </button>
            <button
              (click)="currentTab.set('game')"
              [class.active-tab]="currentTab() === 'game'"
              class="tab-btn"
            >
              ♟ Jeu
            </button>
            <button
              (click)="currentTab.set('notifications')"
              [class.active-tab]="currentTab() === 'notifications'"
              class="tab-btn"
            >
              🔔 Notifications
            </button>
            <button
              (click)="currentTab.set('privacy')"
              [class.active-tab]="currentTab() === 'privacy'"
              class="tab-btn"
            >
              👁 Confidentialité
            </button>
            <button
              (click)="currentTab.set('premium')"
              [class.active-tab]="currentTab() === 'premium'"
              class="tab-btn text-[#7AF7F7] bg-[#1D1C1C]"
            >
              💎 Premium
            </button>
          </nav>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-white dark:bg-[#1a1a1a]">
          <!-- MOBILE MENU (Simple dropdown for mobile) -->
          <div class="md:hidden mb-6">
            <label class="text-xs font-bold uppercase text-gray-500">Section</label>
            <select
              [ngModel]="currentTab()"
              (ngModelChange)="currentTab.set($event)"
              class="w-full p-2 border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-black font-bold mt-1"
            >
              <option value="profile">Profil</option>
              <option value="security">Sécurité</option>
              <option value="appearance">Apparence</option>
              <option value="game">Jeu</option>
              <option value="notifications">Notifications</option>
              <option value="privacy">Confidentialité</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <!-- PROFILE -->
          @if (currentTab() === 'profile') {
            <section class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 class="section-title">Profil Public</h3>

              <div class="flex flex-col md:flex-row gap-6">
                <div class="flex flex-col items-center gap-2">
                  <img
                    [src]="auth.currentUser()?.avatar"
                    class="w-32 h-32 border-4 border-[#1D1C1C] dark:border-white bg-gray-100"
                  />
                  <div class="flex gap-2">
                    <input
                      [formControl]="avatarSeed"
                      class="w-32 px-2 py-1 text-xs border-2 border-[#1D1C1C] dark:border-white bg-transparent"
                      placeholder="Seed..."
                    />
                    <button
                      (click)="randomizeAvatar()"
                      class="px-2 py-1 bg-[#1D1C1C] text-white text-xs font-bold"
                    >
                      🎲
                    </button>
                  </div>
                </div>
                <div class="flex-1 space-y-4">
                  <div>
                    <label class="input-label">Nom d'utilisateur</label>
                    <input
                      [value]="auth.currentUser()?.name"
                      disabled
                      class="input-field opacity-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label class="input-label">Biographie</label>
                    <textarea
                      [formControl]="bioControl"
                      rows="4"
                      class="input-field"
                      placeholder="Parlez de votre style de jeu..."
                    ></textarea>
                  </div>
                </div>
              </div>
            </section>
          }

          <!-- SECURITY -->
          @if (currentTab() === 'security') {
            <section class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 class="section-title">Sécurité du compte</h3>

              <div
                class="p-4 border-2 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
              >
                <h4 class="font-bold text-red-600 dark:text-red-400 uppercase text-xs mb-2">
                  Zone Sensible
                </h4>
                <p class="text-sm">Assurez-vous d'utiliser un mot de passe fort.</p>
              </div>

              <div>
                <label class="input-label">Email</label>
                <input
                  [value]="auth.currentUser()?.email"
                  disabled
                  class="input-field opacity-50"
                />
                <p
                  class="text-xs text-green-600 font-bold mt-1"
                  *ngIf="auth.currentUser()?.emailVerified"
                >
                  ✓ Email vérifié
                </p>
              </div>

              <div class="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label class="input-label">Changer le mot de passe</label>
                <input type="password" placeholder="Ancien mot de passe" class="input-field" />
                <input type="password" placeholder="Nouveau mot de passe" class="input-field" />
                <button class="btn-secondary w-full md:w-auto">Mettre à jour</button>
              </div>

              <div
                class="flex items-center justify-between p-4 border-2 border-[#1D1C1C] dark:border-white"
              >
                <div>
                  <h4 class="font-black uppercase">Double Authentification (2FA)</h4>
                  <p class="text-xs text-gray-500">Sécuriser via email ou app.</p>
                </div>
                <div class="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                  <input
                    type="checkbox"
                    [checked]="auth.currentUser()?.twoFactorEnabled"
                    (change)="toggle2FA()"
                    class="absolute opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <span
                    class="block w-full h-full bg-gray-300 dark:bg-gray-700 rounded-full shadow-inner border border-gray-400"
                  ></span>
                  <span
                    class="absolute block w-4 h-4 bg-white rounded-full shadow inset-y-1 left-1 transition-transform duration-200"
                    [class.translate-x-6]="auth.currentUser()?.twoFactorEnabled"
                    [class.bg-[#1D1C1C]]="auth.currentUser()?.twoFactorEnabled"
                  ></span>
                </div>
              </div>
            </section>
          }

          <!-- APPEARANCE -->
          @if (currentTab() === 'appearance') {
            <section class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 class="section-title">Personnalisation</h3>

              <!-- Themes -->
              <div>
                <h4 class="text-xs font-bold uppercase mb-3 text-gray-500">Thème du plateau</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  @for (theme of themes; track theme.id) {
                    <div
                      (click)="tempThemeId.set(theme.id)"
                      class="cursor-pointer border-2 transition-all hover:scale-[1.02] relative"
                      [class.border-[#1D1C1C]]="true"
                      [class.dark:border-white]="true"
                      [class.ring-4]="tempThemeId() === theme.id"
                      [class.ring-[#FFF48D]]="tempThemeId() === theme.id"
                    >
                      <div class="h-16 flex">
                        <div class="w-1/2 h-full" [style.backgroundColor]="theme.light"></div>
                        <div class="w-1/2 h-full" [style.backgroundColor]="theme.dark"></div>
                      </div>
                      <div
                        class="p-2 text-xs font-bold uppercase text-center bg-white dark:bg-black text-[#1D1C1C] dark:text-white"
                      >
                        {{ theme.name }}
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Dark Mode -->
              <div
                class="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-2 border-transparent"
              >
                <span class="font-bold uppercase">Mode Sombre</span>
                <button (click)="toggleDarkMode()" class="text-2xl">
                  {{ tempDarkMode() ? '🌙' : '☀️' }}
                </button>
              </div>
            </section>
          }

          <!-- GAME -->
          @if (currentTab() === 'game') {
            <section class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 class="section-title">Gameplay</h3>

              <div class="space-y-4">
                <div class="setting-row">
                  <span>Promotion automatique (Dame)</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.gameSettings().autoQueen"
                    (change)="updateGameSetting('autoQueen', $event)"
                    class="toggle-checkbox"
                  />
                </div>
                <div class="setting-row">
                  <span>Confirmer l'abandon</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.gameSettings().confirmResign"
                    (change)="updateGameSetting('confirmResign', $event)"
                    class="toggle-checkbox"
                  />
                </div>
                <div class="setting-row">
                  <span>Activer les premoves (coups anticipés)</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.gameSettings().allowPremoves"
                    (change)="updateGameSetting('allowPremoves', $event)"
                    class="toggle-checkbox"
                  />
                </div>
                <div class="setting-row">
                  <span>Sons du jeu</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.gameSettings().soundEnabled"
                    (change)="updateGameSetting('soundEnabled', $event)"
                    class="toggle-checkbox"
                  />
                </div>

                <div>
                  <label class="input-label">Méthode de saisie</label>
                  <div class="flex space-x-2 mt-2">
                    <button
                      (click)="updateInputMethod('drag')"
                      [class.selected-pill]="prefs.gameSettings().inputMethod === 'drag'"
                      class="pill-btn"
                    >
                      Glisser
                    </button>
                    <button
                      (click)="updateInputMethod('click')"
                      [class.selected-pill]="prefs.gameSettings().inputMethod === 'click'"
                      class="pill-btn"
                    >
                      Cliquer
                    </button>
                    <button
                      (click)="updateInputMethod('both')"
                      [class.selected-pill]="prefs.gameSettings().inputMethod === 'both'"
                      class="pill-btn"
                    >
                      Les deux
                    </button>
                  </div>
                </div>
              </div>
            </section>
          }

          <!-- NOTIFICATIONS -->
          @if (currentTab() === 'notifications') {
            <section class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 class="section-title">Alertes</h3>
              <div class="space-y-4 bg-white dark:bg-[#1a1a1a] p-1">
                <div class="setting-row">
                  <span>Notifications Push (Navigateur)</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.notifications().push"
                    (change)="updateNotif('push', $event)"
                    class="toggle-checkbox"
                  />
                </div>
                <div class="setting-row">
                  <span>Emails (Récap, Sécurité)</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.notifications().email"
                    (change)="updateNotif('email', $event)"
                    class="toggle-checkbox"
                  />
                </div>
                <div class="setting-row">
                  <span>Son de notification (Tournoi, Message)</span>
                  <input
                    type="checkbox"
                    [checked]="prefs.notifications().sound"
                    (change)="updateNotif('sound', $event)"
                    class="toggle-checkbox"
                  />
                </div>
              </div>
            </section>
          }

          <!-- PRIVACY -->
          @if (currentTab() === 'privacy') {
            <section class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 class="section-title">Vie Privée</h3>

              <div class="setting-row">
                <span>Profil Public (Visible par tous)</span>
                <input
                  type="checkbox"
                  [checked]="prefs.privacy().publicProfile"
                  (change)="updatePrivacy('publicProfile', $event)"
                  class="toggle-checkbox"
                />
              </div>

              <div>
                <label class="input-label">Qui peut vous défier ?</label>
                <select
                  [value]="prefs.privacy().allowChallenges"
                  (change)="updateChallengePrivacy($event)"
                  class="input-field mt-2"
                >
                  <option value="all">Tout le monde</option>
                  <option value="friends">Amis seulement</option>
                  <option value="none">Personne</option>
                </select>
              </div>

              <div class="pt-8 mt-8 border-t border-red-200">
                <h4 class="text-red-600 font-black uppercase text-sm mb-2">Zone de Danger</h4>
                <button
                  class="text-red-600 border-2 border-red-600 px-4 py-2 font-bold text-xs uppercase hover:bg-red-50"
                >
                  Supprimer mon compte
                </button>
              </div>
            </section>
          }

          <!-- PREMIUM -->
          @if (currentTab() === 'premium') {
            <section
              class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center"
            >
              <div
                class="w-20 h-20 bg-[#FFF48D] mx-auto flex items-center justify-center text-4xl border-2 border-[#1D1C1C] mb-4"
              >
                💎
              </div>
              <h3 class="text-3xl font-black font-display uppercase">Chess Master Premium</h3>

              @if (auth.currentUser()?.isPremium) {
                <div
                  class="bg-green-100 text-green-800 p-4 border-2 border-green-500 inline-block font-bold"
                >
                  Vous êtes membre Premium ! Merci de votre soutien.
                </div>
              } @else {
                <p class="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  Débloquez les analyses illimitées, les thèmes exclusifs et supprimez les (futures)
                  publicités.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto mt-8">
                  <div class="border-2 border-[#1D1C1C] p-4 hover:bg-gray-50 cursor-pointer">
                    <h4 class="font-black text-xl">Mensuel</h4>
                    <p class="text-2xl my-2">4.99€</p>
                    <p class="text-xs text-gray-500">Annulable à tout moment</p>
                  </div>
                  <div
                    class="border-2 border-[#1D1C1C] bg-[#1D1C1C] text-white p-4 relative overflow-hidden cursor-pointer hover:opacity-90"
                    (click)="upgrade()"
                  >
                    <div
                      class="absolute top-0 right-0 bg-[#FFF48D] text-[#1D1C1C] text-[10px] font-bold px-2"
                    >
                      BEST
                    </div>
                    <h4 class="font-black text-xl">Annuel</h4>
                    <p class="text-2xl my-2">39.99€</p>
                    <p class="text-xs opacity-70">2 mois offerts</p>
                  </div>
                </div>
                <button
                  (click)="upgrade()"
                  [disabled]="auth.isLoading()"
                  class="mt-8 px-8 py-4 bg-[#7AF7F7] text-[#1D1C1C] font-black uppercase text-xl border-2 border-[#1D1C1C] wero-shadow hover:bg-[#FFF48D] transition-colors"
                >
                  {{ auth.isLoading() ? 'Traitement...' : 'Devenir Premium' }}
                </button>
              }
            </section>
          }
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-6 border-t-2 border-[#1D1C1C] dark:border-white bg-gray-50 dark:bg-[#121212] flex justify-end space-x-4 z-10"
      >
        <button
          (click)="close.emit()"
          class="px-6 py-3 bg-transparent border-2 border-transparent text-[#1D1C1C] dark:text-white font-bold uppercase hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-sm"
        >
          Fermer
        </button>
        <button
          (click)="saveChanges()"
          class="px-6 py-3 bg-[#1D1C1C] dark:bg-white text-white dark:text-black border-2 border-[#1D1C1C] dark:border-white font-black uppercase hover:opacity-90 transition-all wero-shadow-sm text-sm min-w-[140px]"
          [class.bg-green-500]="showSuccess()"
          [class.border-green-600]="showSuccess()"
        >
          {{ showSuccess() ? 'Sauvegardé !' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .tab-btn {
        @apply w-full text-left px-4 py-3 font-bold uppercase text-sm border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-[#1D1C1C] dark:text-gray-300;
      }
      .active-tab {
        @apply bg-white dark:bg-[#1a1a1a] border-[#1D1C1C] dark:border-white wero-shadow-sm text-black dark:text-white;
      }
      .section-title {
        @apply text-xl font-black text-[#1D1C1C] dark:text-white uppercase mb-6 pb-2 border-b-2 border-gray-200 dark:border-gray-800;
      }
      .input-label {
        @apply block text-xs font-bold font-display text-gray-500 uppercase mb-2;
      }
      .input-field {
        @apply w-full px-3 py-2 border-2 border-[#1D1C1C] dark:border-white bg-white dark:bg-black font-medium outline-none focus:ring-2 focus:ring-[#7AF7F7];
      }
      .btn-secondary {
        @apply px-4 py-2 bg-white dark:bg-black border-2 border-[#1D1C1C] dark:border-white font-bold uppercase text-xs hover:bg-gray-100 dark:hover:bg-gray-900;
      }
      .setting-row {
        @apply flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black font-bold text-sm;
      }
      .toggle-checkbox {
        @apply w-5 h-5 accent-[#1D1C1C] cursor-pointer;
      }
      .pill-btn {
        @apply px-3 py-1 border border-[#1D1C1C] dark:border-white text-xs font-bold uppercase hover:bg-gray-100 dark:hover:bg-gray-800;
      }
      .selected-pill {
        @apply bg-[#1D1C1C] text-white dark:bg-white dark:text-black;
      }
    `
  ]
})
export class SettingsComponent implements OnInit {
  prefs = inject(PreferencesService);
  auth = inject(AuthService);

  close = output<void>();

  currentTab = signal<SettingsTab>('profile');

  themes = BOARD_THEMES;

  // Temp State
  tempThemeId = signal('wero');
  tempDarkMode = signal(false);
  avatarSeed = new FormControl('');
  bioControl = new FormControl('');

  showSuccess = signal(false);

  ngOnInit() {
    // Init temp values
    this.tempThemeId.set(this.prefs.activeThemeId());
    this.tempDarkMode.set(this.prefs.darkMode());
    this.avatarSeed.setValue(this.auth.currentUser()?.avatar.split('seed=')[1] || '');
    this.bioControl.setValue(this.auth.currentUser()?.bio || '');
  }

  randomizeAvatar() {
    this.avatarSeed.setValue(Math.random().toString(36).substring(7));
  }

  toggleDarkMode() {
    this.tempDarkMode.update((d) => !d);
  }

  toggle2FA() {
    // Mock toggle
    const current = this.auth.currentUser()?.twoFactorEnabled;
    this.auth.toggle2FA(!current);
  }

  updateGameSetting(key: keyof GameSettings, event: any) {
    this.prefs.updateGameSettings({ [key]: event.target.checked });
  }

  updateInputMethod(method: 'drag' | 'click' | 'both') {
    this.prefs.updateGameSettings({ inputMethod: method });
  }

  updateNotif(
    key: keyof NotificationSettings,
    event: any
  ) {
    this.prefs.updateNotifications({ [key]: event.target.checked });
  }

  updatePrivacy(key: keyof PrivacySettings, event: any) {
    this.prefs.updatePrivacy({ [key]: event.target.checked });
  }

  updateChallengePrivacy(event: any) {
    this.prefs.updatePrivacy({ allowChallenges: event.target.value });
  }

  async upgrade() {
    await this.auth.upgradePremium();
  }

  async saveChanges() {
    // 1. Save Visuals
    this.prefs.activeThemeId.set(this.tempThemeId());
    this.prefs.darkMode.set(this.tempDarkMode());

    // 2. Save Profile (Bio, Avatar)
    if (this.avatarSeed.value || this.bioControl.value) {
      await this.auth.updateProfile({
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${this.avatarSeed.value}`,
        bio: this.bioControl.value || ''
      });
    }

    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 2000);
  }
}
