# AGENTS.md - Developer Guide

## Project Overview

This is the **Chess Simul Platform** - a monorepo application for managing concurrent chess exhibitions (simuls). It features a modern Angular frontend, Supabase backend for realtime interaction, and sophisticated chess logic.

## Technology Stack

- **Angular 21+** (Experimental/Next)
- **TypeScript 5.9+**
- **Tailwind CSS 3.4+**
- **Supabase** (Auth, Database, Realtime, Edge Functions)
- **Vite** (Dev Server & Bundler via Angular CLI)
- **Playwright** & **Vitest** for testing

## Essential Commands

### Development

```bash
npm install          # Install dependencies
npm run dev          # Start web dev server (localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm test             # Run unit tests
```

## Project Structure

```
.
├── apps/
│   └── web/             # Main Angular application
├── packages/
│   └── shared/          # Shared utilities and types
├── supabase/            # Database migrations, seed data, functions
├── scripts/             # Build and maintenance scripts
└── ...
```

## Architecture Patterns

### State Management

- **Angular Signals** for reactive state updates.
- **Supabase Clients** for data persistence and realtime subscriptions.

### Component Organization

- Feature-based architecture (e.g., `components/board`, `components/chat`).
- Standalone components (Angular default).

## Code Conventions

### TypeScript

- Strict mode enabled.
- Angular Style Guide (kebab-case files, PascalCase classes).
- Signals preferred over RxJS for synchronous state.

### Component Pattern

```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  template: `...`,
  imports: [CommonModule]
})
export class FeatureComponent {
  // Use signals
  data = signal<Data | null>(null);
}
```

## Backend Integration

### Supabase

- **Authentication**: Managed via Supabase Auth.
- **Database**: PostgreSQL with Row Level Security (RLS).
- **Edge Functions**: TypeScript functions in `supabase/functions`.
- **Realtime**: WebSocket subscriptions for game updates.
- **Migrations**: **SYSTEMATICALLY** create new migrations for ALL schema changes. Do not use the dashboard.

## Key Files for Understanding

1.  `apps/web/index.tsx` - Application entry point.
2.  `apps/web/src/app.routes.ts` - Main routing configuration.
3.  `apps/web/src/services/` - Core business logic and API interaction.
4.  `supabase/config.toml` - Supabase local configuration.

## Development Workflow

- **Linting**: `npm run lint` must pass before commit.
- **Testing**: `npm test` (Unit) and `npm run test:e2e` (Playwright).
- **Migrations**: Always generate migrations for DB changes.
- **Commits**: Follow Conventional Commits convention.
