# Chess Simul Monorepo

A minimal monorepo housing the Angular web client and a Supabase backend workspace.

## Structure
- `apps/web`: Angular application.
- `packages/shared`: Reusable types and helpers shared across packages.
- `supabase`: Database migrations, seed data, and generated types.

## Prerequisites
- Node.js 20+
- npm 10+ (using npm workspaces)
- (Optional) Docker + Supabase CLI for local database work

## Installation
```bash
npm install
```

## Local development
```bash
npm run dev
```
The Angular dev server runs on http://localhost:3000 by default.

## Build
```bash
npm run build
```

## Lint, format, and type-check
```bash
npm run lint
npm run format:check
npm run typecheck
```

## Environment variables
Create a `.env.local` at the repo root for web-only secrets (e.g., `GEMINI_API_KEY`).
When running Supabase locally, the CLI will generate `.env` files inside `supabase/`—do not commit them.

## Supabase quick start
1. Install and authenticate the Supabase CLI: `supabase login`.
2. Link to your project: `supabase link --project-ref <ref>`.
3. Start local stack: `supabase start` (requires Docker).
4. Apply migrations: `supabase migration up`.
5. Seed local data (optional): `supabase db reset --use-migra --seed supabase/seed.sql`.

## Next steps for Supabase
- Model chess simul entities (players, sessions, games) and add first migration in `supabase/migrations`.
- Generate typed client artifacts into `supabase/types` and expose them via `@chess-simul/shared`.
- Add Supabase auth and RPC calls to the Angular app once schemas are stable.
