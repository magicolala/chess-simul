import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { RegisterPageComponent } from './pages/register-page.component';
import { SettingsPageComponent } from './pages/settings-page.component';
import { HydraTournamentPageComponent } from './pages/hydra-tournament-page.component';
import { RoundRobinSimulPageComponent } from './pages/round-robin-simul-page.component';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', children: [] },
  { path: 'login', canActivate: [GuestGuard], component: LoginPageComponent },
  { path: 'register', canActivate: [GuestGuard], component: RegisterPageComponent },
  { path: 'settings', canActivate: [AuthGuard], component: SettingsPageComponent },
  {
    path: 'hydra-tournament/:id',
    canActivate: [AuthGuard],
    component: HydraTournamentPageComponent
  },
  { path: 'round-robin-simul', component: RoundRobinSimulPageComponent },
  { path: '**', redirectTo: '' }
];
