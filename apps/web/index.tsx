import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppShellComponent } from './src/app-shell.component';
import { routes } from './src/app.routes';

bootstrapApplication(AppShellComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideRouter(routes)
  ]
}).catch((err) => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
