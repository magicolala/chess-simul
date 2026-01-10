import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { RegisterPageComponent } from './pages/register-page.component';
import { SettingsPageComponent } from './pages/settings-page.component';
import { HydraTournamentPageComponent } from './pages/hydra-tournament-page.component';
import { RoundRobinSimulPageComponent } from './pages/round-robin-simul-page.component';
import { LocalGamePageComponent } from './pages/local-game-page.component';
import { LocalPlayPageComponent } from './pages/local-play-page.component';

import { DashboardComponent } from './components/dashboard.component';
import { OnlineGameComponent } from './components/online-game.component';
import { MultiplayerLobbyComponent } from './components/multiplayer-lobby.component';
import { GamesGridComponent } from './components/games-grid.component';
import { HistoryComponent } from './components/history.component';
import { AnalysisComponent } from './components/analysis.component';
import { SocialHubComponent } from './components/social-hub.component';
import { PublicProfileComponent } from './components/public-profile.component';
import { FriendLobbyComponent } from './components/friend-lobby.component';

import { SimulListComponent } from './components/simul-list.component';
import { SimulCreateComponent } from './components/simul-create.component';
import { SimulLobbyComponent } from './components/simul-lobby.component';
import { SimulHostComponent } from './components/simul-host.component';
import { SimulPlayerComponent } from './components/simul-player.component';

import { LandingComponent } from './components/landing.component';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', canActivate: [GuestGuard], component: LandingComponent },
  
  // Public / Auth
  { path: 'login', canActivate: [GuestGuard], component: LoginPageComponent },
  { path: 'register', canActivate: [GuestGuard], component: RegisterPageComponent },
  
  // App Pages (Guarded)
  { 
    path: 'dashboard', 
    canActivate: [AuthGuard], 
    component: DashboardComponent 
  },
  { 
    path: 'game', // The "Table de jeu" page (Local)
    canActivate: [AuthGuard], 
    component: LocalGamePageComponent 
  },
  {
    path: 'local/:id',
    canActivate: [AuthGuard],
    component: LocalPlayPageComponent
  },
  { 
    path: 'play', // Multiplayer Lobby
    canActivate: [AuthGuard], 
    component: MultiplayerLobbyComponent 
  },
  { 
    path: 'online-game/:id', 
    canActivate: [AuthGuard], 
    component: OnlineGameComponent 
  },
  { 
    path: 'games', // My Games Grid
    canActivate: [AuthGuard], 
    component: GamesGridComponent 
  },
  { 
    path: 'history', 
    canActivate: [AuthGuard], 
    component: HistoryComponent 
  },
  { 
    path: 'analysis', 
    canActivate: [AuthGuard], 
    component: AnalysisComponent 
  },
  { 
    path: 'social', 
    canActivate: [AuthGuard], 
    component: SocialHubComponent 
  },
  { 
    path: 'u/:id', 
    canActivate: [AuthGuard], 
    component: PublicProfileComponent 
  },
  { 
    path: 'friend-lobby', 
    canActivate: [AuthGuard], 
    component: FriendLobbyComponent 
  },
  { 
    path: 'settings', 
    canActivate: [AuthGuard], 
    component: SettingsPageComponent 
  },

  // Simuls
  { 
    path: 'simuls', 
    canActivate: [AuthGuard], 
    component: SimulListComponent 
  },
  { 
    path: 'simuls/create', 
    canActivate: [AuthGuard], 
    component: SimulCreateComponent 
  },
  { 
    path: 'simuls/:id', 
    canActivate: [AuthGuard], 
    component: SimulLobbyComponent 
  },
  { 
    path: 'simuls/:id/host', 
    canActivate: [AuthGuard], 
    component: SimulHostComponent 
  },
  { 
    path: 'simuls/:id/play', 
    canActivate: [AuthGuard], 
    component: SimulPlayerComponent 
  },

  // Special Events
  {
    path: 'hydra-tournament/:id',
    canActivate: [AuthGuard],
    component: HydraTournamentPageComponent
  },
  { path: 'round-robin-simul', component: RoundRobinSimulPageComponent },

  { path: '**', redirectTo: 'dashboard' }
];
