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
Le build injecte les variables Supabase via `scripts/generate-env.mjs` (voir `DEPLOY.md`).

## Lint, format, and type-check
```bash
npm run lint
npm run format:check
npm run typecheck
```

## CI et déploiement
- GitHub Actions exécute `npm run lint`, `npm test` et `npm run build` sur chaque push/PR.
- Le guide complet pour Netlify/Vercel/Cloudflare Pages + Supabase est dans `DEPLOY.md`.

## Environment variables
Create a `.env.local` at the repo root for web-only secrets (e.g., `GEMINI_API_KEY`).
When running Supabase locally, the CLI will generate `.env` files inside `supabase/`—do not commit them.

For the Angular client, configure your Supabase public credentials in `apps/web/src/environments/`:
- `environment.ts` (production defaults)
- `environment.development.ts` (used by `ng serve`)

Only ever expose the public `anon` key in these files. Never ship or commit the `service_role` key to the browser.

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

## Supabase Realtime quick usage
- `RealtimeGameService` (Angular) listens to Postgres changes on `games` (UPDATE) and `moves` (INSERT) while tracking presence on `game:{gameId}`.
- Simul lobbies reuse the same service on `simul:{simulId}` to stream board updates for all hosted tables.
- Presence payloads are limited to `{ user_id, username }` and exposed via `onlinePlayers$`.
- Verify RLS policies by subscribing with a user that does **not** pass your row filters: the channel should not emit rows for games the session cannot `select`.

### Performance notes
- Filter early: listen only to `UPDATE`/`INSERT` events and apply `filter` parameters such as `id=eq.{gameId}` or `simul_id=eq.{simulId}`.
- Keep payloads lean: restrict columns in your `select` queries that seed the client and avoid heavy computed fields in realtime payloads.
- Paginate historical moves instead of streaming the full table—use `preloadMoves()` with the latest page and let Realtime append.
- Prefer differential updates (incremental `updated_at`, `fen` slices) over full board snapshots to minimize websocket bandwidth.
