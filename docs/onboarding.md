# Onboarding dev

Guide rapide pour prendre en main le monorepo Chess Simul.

## Prerequis

- Node.js 20+
- npm 10+
- (Optionnel) Docker + Supabase CLI pour la base locale

## Setup local

```bash
npm install
```

### Variables d'environnement

- Creez `.env.local` a la racine pour les secrets web (ex: `GEMINI_API_KEY`).
- Ne jamais commit les `.env` generes par Supabase dans `supabase/`.
- Les credentials publics Supabase se configurent dans:
  - `apps/web/src/environments/environment.ts`
  - `apps/web/src/environments/environment.development.ts`
- N'exposez que la cle publique `anon`.

## Demarrer le front

```bash
npm run dev
```

Angular sert l'app sur http://localhost:3000.

## Supabase local (optionnel)

```bash
supabase login
supabase link --project-ref <ref>
npm run supabase:start
npm run supabase:db:push
npm run supabase:gen:types
```

Notes:

- `npm run supabase:migrate:up` applique aussi les migrations si besoin.
- `npm run supabase:reset` relance la stack et reseed.

## Qualite et tests

Avant review/merge, les commandes suivantes doivent passer:

```bash
npm run lint
npm run format:check
npm test
```

`npm test` lance le typecheck et les tests unitaires du workspace web.

## Flux de travail

- Toute feature doit avoir un spec dans `specs/.../spec.md` avec plan/taches.
- Respecter les frontieres de workspace: pas d'import direct entre apps/packages.
- Migrations et types Supabase vivent dans `supabase/`.

## Carte rapide du repo

- `apps/web`: client Angular.
- `packages/shared`: types et helpers partages.
- `supabase`: migrations, seeds, types.
- `scripts`: scripts repo-wide (env, migrations, types).
- `docs`: documentation produit/tech.
- `specs`: specs et taches.

## Ressources utiles

- `README.md`: commandes et vue d'ensemble.
- `DEPLOY.md`: guide de deploiement.
