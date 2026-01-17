# Chess Simul Monorepo

Plateforme de simul d'echecs en monorepo (Angular + Supabase) avec partage de types et scripts
outilles.

## Demarrage rapide

```bash
npm install
npm run dev
```

Le serveur Angular tourne sur http://localhost:3000 par defaut.

## Organisation du repo

- `apps/web`: client Angular.
- `packages/shared`: types et helpers partages entre workspaces.
- `supabase`: migrations, seed data, types generes.
- `scripts`: scripts repo-wide (env, types Supabase, migrations).
- `docs`: notes produit/tech.
- `specs`: specifications fonctionnelles.

## Prerequis

- Node.js 20+
- npm 10+ (npm workspaces)
- (Optionnel) Docker + Supabase CLI pour la base locale

## Commandes utiles

```bash
# Dev / build
npm run dev
npm run build
npm run generate:env

# Qualite
npm run lint
npm run format
npm run format:check
npm test

# Supabase
npm run supabase:start
npm run supabase:stop
npm run supabase:reset
npm run supabase:migrate:up
npm run supabase:db:push
npm run supabase:gen:types
npm run supabase:types:check
```

Notes:

- `npm run build` injecte les variables Supabase via `scripts/generate-env.mjs` (voir `DEPLOY.md`).
- `npm test` lance le typecheck et les tests unitaires (`vitest run`) du workspace web.

## CI et deploiement

- GitHub Actions execute `npm run lint`, `npm test` et `npm run build` sur chaque push/PR.
- Le guide complet pour Netlify/Vercel/Cloudflare Pages + Supabase est dans `DEPLOY.md`.

## Variables d'environnement

Creez un `.env.local` a la racine pour les secrets web (ex: `GEMINI_API_KEY`).
En local, la CLI Supabase genere des `.env` dans `supabase/` — ne pas commit.

Pour le client Angular, configurez vos credentials publics Supabase dans
`apps/web/src/environments/`:

- `environment.ts` (production)
- `environment.development.ts` (dev `ng serve`)

N'exposez que la cle publique `anon` dans ces fichiers. Ne committez jamais
`service_role` dans le navigateur.

## Supabase: demarrage local

1. Authentifiez-vous: `supabase login`.
2. Liez le projet: `supabase link --project-ref <ref>`.
3. Demarrez la stack locale: `npm run supabase:start` (Docker requis).
4. Appliquez les migrations: `npm run supabase:db:push` (ou `npm run supabase:migrate:up`).
5. (Optionnel) Resetez et seed: `npm run supabase:reset`.
6. Generez les types: `npm run supabase:gen:types`.

## Realtime et securite (resume)

- `RealtimeGameService` ecoute `games` (UPDATE) et `moves` (INSERT) avec presence sur
  `game:{gameId}`; les lobbies reutilisent `simul:{simulId}`.
- Les payloads de presence sont limites a `{ user_id, username }` exposes via `onlinePlayers$`.
- Les clients ne modifient pas `games`/`moves` directement; l'Edge Function `submit-move`
  valide et persiste les coups.

### Notes performance

- Filtrer tot: limiter les events et ajouter `filter` (`id=eq.{gameId}` ou
  `simul_id=eq.{simulId}`).
- Reduire les payloads: restreindre les colonnes dans les `select` de seed.
- Paginer l'historique des coups et laisser Realtime append.
- Preferer les updates differencielles plutot que des snapshots complets.
