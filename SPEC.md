# Chess Simul Platform - Spécification Technique

**Version** : 0.1.0  
**Date** : Janvier 2026  
**Statut** : En développement actif

---

## 1. Vision du Projet

La **Chess Simul Platform** est une plateforme web moderne de jeu d'échecs permettant :
- Des parties classiques entre deux joueurs
- Des simultanées privées en mode round-robin (tous contre tous)
- Des tournois **Hydra** multi-tables à haute intensité
- Un système social complet (amis, défis, chat)

---

## 2. Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Angular 21+ (standalone components), TypeScript 5.9+, Tailwind CSS 3.4+ |
| **Bundler** | Vite via Angular CLI |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| **Tests** | Vitest (unit), Playwright (E2E) |
| **CI/CD** | GitHub Actions |

### Architecture Monorepo

```
chess-simul/
├── apps/web/              # Application Angular principale
├── packages/shared/       # Types et utilitaires partagés
├── supabase/              # Migrations, seed, Edge Functions
├── scripts/               # Scripts de build et maintenance
├── specs/                 # Spécifications fonctionnelles par feature
├── docs/                  # Documentation technique
└── e2e/                   # Tests end-to-end Playwright
```

---

## 3. Fonctionnalités Principales

### 3.1 Jeu d'Échecs Classique

- **Échiquier interactif** : Composant réutilisable avec drag & drop
- **Validation des coups** : Logique côté serveur via Edge Function `submit-move`
- **Pendule** : Contrôles de temps configurables (ex: 5+3, 10+0)
- **Historique des parties** : Sauvegarde et relecture des parties jouées
- **Analyse** : Intégration Stockfish WASM pour évaluation des positions

### 3.2 Simultanées Round-Robin

> Créer des sessions privées où tous les participants s'affrontent mutuellement.

**Workflow :**
1. L'organisateur crée une session privée
2. Un lien d'invitation est généré
3. Les participants rejoignent via le lien
4. L'organisateur démarre manuellement la session
5. Le système génère automatiquement toutes les parties (round-robin)

**Exigences fonctionnelles :**
- Pas de limite de participants prédéfinie
- Un seul match par paire de joueurs
- Verrouillage du roster après démarrage
- Interface de lobby temps réel

### 3.3 Tournois Hydra (Multi-Tables)

> Format haute intensité où les joueurs gèrent plusieurs parties simultanément.

**Scoring Hydra :**
| Résultat | Points |
|----------|--------|
| Victoire | +3 |
| Nulle | +1 |
| Défaite | -1 |

**Modes de jeu :**
- **Arena (L'Heure de l'Hydre)** : Durée fixe, score final détermine le classement
- **Survie** : Pool de vies, élimination progressive

**Interface Mosaïque :**
- 1 partie : Plein écran
- 2-4 parties : Grille 2x2
- 5-9 parties : Grille 3x3
- Indicateur visuel pour les coups adverses urgents

**Matchmaking :**
- File d'attente globale par tournoi
- Fenêtre Elo initiale ±100, s'élargissant toutes les 10 secondes
- Forfait automatique après 20 secondes d'inactivité

### 3.4 Système Social

- **Profils utilisateurs** : Bio, statistiques, Elo
- **Système d'amis** : Demandes, acceptation, liste d'amis
- **Défis** : Inviter un ami à une partie avec paramètres personnalisés
- **Chat** : Messagerie temps réel (à implémenter)
- **Profils publics** : Consultation des statistiques d'autres joueurs

### 3.5 Authentification & Onboarding

- **Inscription/Connexion** : Via Supabase Auth (email/password)
- **Vérification email** : Flow de confirmation
- **Récupération de mot de passe** : Reset par email
- **Onboarding** : Guide pour les nouveaux utilisateurs

### 3.6 Mode "Main-Cerveau" (Pièce Imposée)

> Mode de jeu innovant où un moteur d'échecs ("le Cerveau") détermine quelle pièce le joueur doit jouer à chaque tour.

**Concept :**
- À chaque tour, le système consulte Stockfish pour déterminer le meilleur coup
- La **case de départ** de ce coup est imposée au joueur ("pièce forcée")
- Le joueur peut jouer **n'importe quel coup légal** avec cette pièce
- Le Cerveau ne dicte pas la destination, seulement la pièce à bouger

**Workflow d'un tour :**
1. Le tour commence → Statut : `thinking` (indicateur visuel de réflexion)
2. Stockfish calcule le meilleur coup (~200ms)
3. Statut passe à `ready` → La case forcée est surlignée
4. Message affiché : *"Cerveau : vous devez jouer la pièce en e4."*
5. Le joueur ne peut sélectionner que la pièce imposée
6. Une fois le coup joué, le tour passe à l'adversaire

**États du Cerveau (`brainStatus`) :**

| État | Description |
|------|-------------|
| `idle` | Aucun calcul en cours (tour de l'adversaire) |
| `thinking` | Stockfish calcule le meilleur coup |
| `ready` | Pièce forcée déterminée, en attente du coup joueur |

**Validation :**
- Si le joueur tente de bouger une autre pièce → bloqué + message d'erreur
- Si la position change (multijoueur) → recalcul immédiat du coup forcé
- `brainForcedForPosition` assure que le coup forcé correspond à la position actuelle

**Interface utilisateur :**
- Indicateur visuel de réflexion (throbber/animation) pendant `thinking`
- Case forcée surlignée en couleur spéciale
- Message système indiquant la case imposée
- Feedback immédiat si tentative de coup invalide

---

## 4. Navigation & Menu Principal

L'application authentifiée dispose d'une barre latérale (sidebar) avec deux sections de navigation.

### Menu Principal

| Icône | Lien | Vue(s) | Description |
|:-----:|------|--------|-------------|
| 📊 | **Tableau de bord** | `dashboard` | Page d'accueil après connexion. Affiche un résumé des parties en cours, accès rapides aux actions principales (Quick Play, reprendre une partie, accéder à l'historique ou au social). |
| ♟️ | **Table de jeu** | `game`, `focus` | Mode de jeu local "Pass & Play" pour jouer à deux sur le même appareil. Permet de créer des parties locales avec choix de cadence (3/5/10 min) et mode de jeu (classique ou pièce imposée). |
| 🌍 | **Multijoueur** | `multiplayer-lobby`, `game-room`, `online-game` | Lobby de matchmaking en ligne. Permet de rejoindre une file d'attente pour trouver un adversaire selon son Elo. Inclut les options de Quick Play et défis entre amis. |
| ⚔️ | **Simultanées** | `simul-list`, `simul-create`, `simul-lobby`, `simul-host`, `simul-player` | Gestion des simultanées classiques (un maître vs plusieurs challengers). Liste des sessions actives, création, lobby d'attente, et interfaces hôte/participant. |
| 🔁 | **Round Robin** | `round-robin-simul` | Sessions privées "tous contre tous". Création via lien d'invitation, lobby temps réel, génération automatique des pairings quand l'organisateur démarre. Accessible aussi sans authentification via lien direct. |
| 🔬 | **Analyse** | `analysis` | Mode analyse de position avec intégration Stockfish WASM. Permet d'importer un PGN, naviguer dans les coups, voir l'évaluation moteur et les meilleures lignes. |
| 💬 | **Communauté** | `social-hub`, `public-profile` | Hub social : liste d'amis, demandes en attente, recherche de joueurs, envoi de défis. Accès aux profils publics avec statistiques et historique des parties. |
| 🕒 | **Historique** | `history` | Liste des parties jouées par l'utilisateur. Permet de revoir les parties terminées et de les envoyer vers le mode analyse. |

### Section Compte

| Icône | Lien | Action |
|:-----:|------|--------|
| ⚙️ | **Paramètres** | Ouvre une modale avec les réglages du compte : profil (avatar, bio), préférences (thème clair/sombre, orientation échiquier), et gestion du compte. |
| 🚪 | **Déconnexion** | Déconnecte l'utilisateur et retourne à la page d'accueil publique (landing). |

### Vues Publiques (Non Authentifié)

| Vue | Description |
|-----|-------------|
| `landing` | Page d'accueil publique avec présentation de la plateforme et boutons Connexion/Inscription. |
| `login` | Formulaire de connexion (email/mot de passe). Liens vers inscription et mot de passe oublié. |
| `register` | Formulaire d'inscription (email, username, mot de passe). |
| `forgot-password` | Demande de réinitialisation de mot de passe par email. |
| `verify-email` | Page de confirmation après inscription, en attente de vérification email. |
| `onboarding` | Guide d'accueil pour les nouveaux utilisateurs après leur première connexion. |

### Éléments de la Top Bar

| Élément | Description |
|---------|-------------|
| 🔍 Recherche | Champ de recherche pour trouver un joueur par nom d'utilisateur. |
| Profil utilisateur | Affiche le nom et l'Elo du joueur connecté. Clic pour accéder à son propre profil public. |

---

## 5. Services Applicatifs

### Services Core

| Service | Responsabilité |
|---------|---------------|
| `ChessLogicService` | Validation des coups, état des parties |
| `AuthService` | Authentification, gestion de session |
| `HistoryService` | Historique et navigation des parties |
| `PreferencesService` | Préférences utilisateur (thème, son) |
| `StockfishService` | Intégration moteur d'analyse |

### Services Supabase

| Service | Responsabilité |
|---------|---------------|
| `SupabaseClientService` | Client Supabase singleton |
| `SupabaseSimulService` | Gestion des simultanées classiques |
| `SupabaseMatchmakingService` | File d'attente et appariement |
| `SupabaseSocialService` | Amis, défis, interactions sociales |

### Services Temps Réel

| Service | Responsabilité |
|---------|---------------|
| `RealtimeGameService` | Subscriptions aux updates de parties |
| `RealtimeSimulService` | Subscriptions aux sessions simul |
| `RoundRobinRealtimeService` | Temps réel pour round-robin |
| `HydraRealtimeService` | Temps réel pour tournois Hydra |

### Services Hydra

| Service | Responsabilité |
|---------|---------------|
| `HydraGameEngineService` | Logique multi-parties |
| `HydraMatchmakingService` | Appariement Hydra |
| `HydraTournamentService` | Gestion des tournois |

---

## 6. Composants UI Principaux

### Navigation & Layout

- `LandingComponent` : Page d'accueil publique
- `DashboardComponent` : Tableau de bord utilisateur
- `SettingsComponent` : Configuration du compte

### Jeu

- `ChessBoardComponent` : Échiquier interactif générique
- `OnlineGameComponent` : Vue partie en ligne
- `AnalysisComponent` : Mode analyse avec Stockfish

### Simultanées

- `SimulCreateComponent` : Création de session
- `SimulLobbyComponent` : Lobby d'attente
- `SimulHostComponent` : Vue organisateur
- `SimulPlayerComponent` : Vue participant
- `RoundRobinLobbyComponent` : Lobby round-robin

### Hydra

- `HydraGameComponent` : Vue partie Hydra
- `HydraBoardMosaicComponent` : Grille multi-tableaux
- `HydraBoardTileComponent` : Tuile individuelle
- `HydraLeaderboardComponent` : Classement en direct

### Social

- `SocialHubComponent` : Centre social (amis, défis)
- `FriendLobbyComponent` : Lobby pour parties entre amis
- `PublicProfileComponent` : Profil public
- `MultiplayerLobbyComponent` : Lobby matchmaking

---

## 7. Edge Functions (Supabase)

| Fonction | Endpoint | Rôle |
|----------|----------|------|
| `submit-move` | POST | Valider et persister un coup |
| `resign-game` | POST | Abandonner une partie |
| `process-game-result` | POST | Traiter le résultat final |
| `join-queue` | POST | Rejoindre la file matchmaking |
| `leave-queue` | POST | Quitter la file |
| `simul-sessions` | CRUD | Gestion des sessions simul |
| `accept-invite` | POST | Accepter une invitation |
| `join-hydra-queue` | POST | Rejoindre file Hydra |
| `process-hydra-queue` | POST | Traiter la file Hydra |
| `hydra-matchmaking` | POST | Appariement Hydra |
| `hydra-scoring` | POST | Calcul des scores |
| `hydra-tournaments` | CRUD | Gestion tournois |

---

## 8. Modèle de Données (Résumé)

### Tables Principales

```
profiles          # Utilisateurs (id, username, bio, elo, onboarding_complete)
games             # Parties (id, white_id, black_id, fen, status, winner, game_mode)
moves             # Coups joués (id, game_id, san, uci, fen_after)
friends           # Relations amis (user_id, friend_id, status)
```

### Tables Round-Robin

```
rr_sessions       # Sessions round-robin (id, host_id, invite_code, status)
rr_participants   # Participants (session_id, user_id, joined_at)
```

### Tables Simul Classique

```
simul_sessions    # Sessions simul (id, host_id, status)
simul_boards      # Plateaux (session_id, player_id, game_id)
```

### Tables Hydra

```
hydra_tournaments             # Tournois (id, mode, duration, status)
hydra_tournament_participants # Participants et scores
hydra_match_queue             # File d'attente matchmaking
```

---

## 9. Temps Réel & Subscriptions

Le système utilise Supabase Realtime pour :

1. **Updates de parties** : `postgres_changes` sur table `games` (UPDATE) et `moves` (INSERT)
2. **Presence lobby** : Canal `simul:{simulId}` ou `game:{gameId}`
3. **Notifications** : Alertes pour coups adverses, fin de partie, etc.

### Bonnes Pratiques Performance

- Filtrer tôt les events (`filter: id=eq.{gameId}`)
- Limiter les colonnes dans les `select`
- Paginer l'historique des coups
- Préférer les updates différentielles aux snapshots complets

---

## 10. Sécurité

### Row Level Security (RLS)

Toutes les tables ont des politiques RLS actives :
- Les utilisateurs ne peuvent modifier que leurs propres données
- Lecture contrôlée selon les relations (amis, participants, etc.)
- Edge Functions avec `service_role` pour opérations privilégiées

### Validation Serveur

- Les coups sont **toujours** validés côté serveur via `submit-move`
- Les clients ne modifient jamais directement `games` ou `moves`
- Tokens JWT vérifiés pour chaque requête authentifiée

---

## 11. Commandes de Développement

```bash
# Développement
npm install              # Installer les dépendances
npm run dev              # Serveur dev (localhost:3000)
npm run build            # Build production

# Qualité
npm run lint             # ESLint
npm run format           # Prettier
npm test                 # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)

# Supabase
npm run supabase:start   # Démarrer stack locale
npm run supabase:reset   # Reset + seed
npm run supabase:migrate:up  # Appliquer migrations
npm run supabase:gen:types   # Générer types TypeScript
```

---

## 12. Déploiement

Voir `DEPLOY.md` pour le guide complet de déploiement sur :
- Netlify
- Vercel
- Cloudflare Pages

---

## 13. Roadmap & TODO

### En cours
- [ ] Système de défis entre amis
- [ ] Amélioration UX tournois Hydra
- [ ] Chat temps réel

### Planifié
- [ ] Mode spectateur
- [ ] Statistiques avancées
- [ ] Thèmes personnalisés
- [ ] Support mobile natif

---

## 14. Références

- [AGENTS.md](./AGENTS.md) - Guide développeur
- [README.md](./README.md) - Quickstart
- [DEPLOY.md](./DEPLOY.md) - Guide de déploiement
- [specs/](./specs/) - Spécifications fonctionnelles par feature
- [docs/](./docs/) - Documentation technique
