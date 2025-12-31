# Déploiement statique (Angular) + Supabase

Ce guide prépare le client Angular pour un hébergement statique (Netlify, Vercel, Cloudflare Pages) avec Supabase en backend. La configuration évite toute exposition de la clé `service_role` et s'appuie uniquement sur la clé publique `anon`.

## Commandes build CI/hosting

- Installation : `npm ci`
- Lint : `npm run lint`
- Tests (typecheck Angular) : `npm test`
- Build production : `npm run build`
- Dossier à publier : `dist/apps/web`

> `npm run build` lance automatiquement `scripts/generate-env.mjs` pour injecter les variables Supabase dans `apps/web/src/environments/` à partir des variables d'environnement (aucune clé secrète n'est commitée).

## Variables d'environnement à définir sur l'hébergeur

| Variable                | Usage                                            | Exemple                         |
| ----------------------- | ------------------------------------------------ | ------------------------------- |
| `SUPABASE_URL`          | URL du projet Supabase (production)              | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY`     | Clé publique `anon` (production)                 | `ey...`                         |
| `SUPABASE_URL_DEV`      | (optionnel) URL Supabase pour les builds préprod | `https://staging.supabase.co`   |
| `SUPABASE_ANON_KEY_DEV` | (optionnel) Clé `anon` préprod                   | `ey...`                         |

Les valeurs sont injectées au build. Ne stockez jamais la clé `service_role` côté front/hosting.

### Netlify

- Build command : `npm run build`
- Publish directory : `dist/apps/web`
- Variables dans l'onglet _Site settings > Build & deploy > Environment_.

### Vercel

- Framework preset : Angular
- Build command : `npm run build`
- Output directory : `dist/apps/web`
- Variables via _Project Settings > Environment Variables_. Ajoutez les mêmes valeurs pour `Production` et `Preview`.

### Cloudflare Pages

- Build command : `npm run build`
- Output directory : `dist/apps/web`
- Node 22 + npm ci (activé via _Environment variables_ > `NODE_VERSION=22` si besoin)
- Variables dans _Settings > Environment Variables_ (sélectionner `Production` et `Preview`).

## Supabase : Auth, CORS et redirections

- **Redirect URLs** (Authentication > URL Configuration) :
  - `http://localhost:3000/*` pour le développement Angular.
  - L'URL publique du front (`https://<domaine>/*`).
  - URLs de preview (Vercel/Netlify) si vous utilisez les déploiements temporaires.
- **CORS** (Authentication > Settings) : ajoutez les mêmes origines `http://localhost:3000` et `https://<domaine>`; autorisez les headers `Authorization, apikey`.
- **Realtime/Storage** : utilisez les mêmes origines autorisées ; n'autorisez jamais les domaines génériques `*` en production.

## Sécurité Supabase

- RLS est activé sur toutes les tables métier : `profiles`, `user_settings`, `simuls`, `simul_tables`, `games`, `moves` (voir `supabase/migrations/20240614000000_chess_schema.sql`).
- Les clients ne peuvent plus modifier `games` ou insérer/éditer `moves` directement : les coups doivent passer par la fonction Edge `submit-move` (service role) qui valide l'auth, l'ordre de jeu et la légalité du coup.
- Les politiques limitent les actions aux hôtes et invités de chaque simul ; les fonctions RPC (`create_simul`, `join_simul`, `start_simul_game`) sont `security definer` et vérifient `auth.uid()`.
- Ne jamais exposer ou injecter la clé `service_role` : seules les clés `anon` (prod/préprod) sont nécessaires côté front et CI.
- Pour vérifier les policies : ouvrez la console SQL Supabase et exécutez `select * from <table>;` avec un utilisateur qui ne correspond pas aux filtres RLS ; l'appel doit être rejeté.

## Check-list go-live

- [ ] Les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont définies sur l'hébergeur (et secrets masqués dans GitHub Actions si besoin).
- [ ] Auth redirect URLs et CORS configurés pour `localhost:3000`, le domaine de production et les domaines de preview.
- [ ] Aucun fichier versionné ne contient de clé `service_role` (chercher `service_role` dans le repo/variables).
- [ ] RLS activé sur `profiles`, `user_settings`, `simuls`, `simul_tables`, `games`, `moves` et policies vérifiées via la console Supabase.
- [ ] Le workflow CI (lint + test + build) passe sur `main` et sur les Pull Requests.
- [ ] Le build statique produit `dist/apps/web` et est bien référencé dans la config de l'hébergeur.
