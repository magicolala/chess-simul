# Neon : secours PostgreSQL (POC, non connecté à l'application)

Issue : [#53](https://github.com/magicolala/chess-simul/issues/53).

## Décision au 4 novembre 2026

Supabase `kjgcgnqeyxzivilkiruz` a été restauré de `INACTIVE` à `ACTIVE_HEALTHY`.
Une requête SQL a confirmé que PostgreSQL 17.6 répond. Les 21 tables publiques sont présentes et
40 migrations sont enregistrées. Des requêtes de comptage ont observé 7 utilisateurs Auth,
24 parties et 0 enregistrement dans `public.moves`.

**Aucune bascule de production** vers Neon : Angular continue à utiliser Supabase Auth, Data API,
Realtime et ses Edge Functions.

## Infrastructure Neon de secours

| Propriété | Valeur |
| --- | --- |
| Projet | `chess-simul-dev` |
| Project ID | `small-wildflower-94657649` |
| Branche | `main` (`br-round-wave-zargwhbs`) |
| Base | `chess_simul` |
| Version | PostgreSQL 17 |
| Région | `aws-eu-west-2` |
| Schéma | `chess_simul` (privé) |

La connexion SQL a été testée avec succès. Le script versionné
[`migrations/0001_poc_core.sql`](migrations/0001_poc_core.sql) a été appliqué
à ce projet de développement et crée neuf tables : `profiles`, `simuls`, `games`,
`moves`, `simul_tables`, `match_queue` et les trois tables round-robin.

Tous les tableaux ont **RLS activé, aucune policy, aucun accès PUBLIC octroyé** :
les API / clients ne peuvent pas les utiliser directement. C'est volontaire, pas un
backend utilisable en production. Les identifiants de profils sont prévus pour une
correspondance d'identités ultérieure, **pas** une implémentation Auth.

### Vérification sans écriture

Exécuter `neon/tests/schema_check.sql` sur la base `chess_simul` ;
attendu : neuf tables, neuf tables RLS, zéro policy et neuf tables sans SELECT
octroyé à `PUBLIC`. Une connexion avec le propriétaire de la base peut néanmoins
bypasser RLS : **ne jamais exposer ses credentials au frontend**.

## Limites bloquantes identifiées

- Neon Realtime n'est **pas disponible** dans `aws-eu-west-2` pour ce projet ;
  il faut un projet dans une région compatible (notamment `aws-eu-central-1`),
  ou une architecture temps réel séparée. Ne pas activer une bascule sans cela.
- Neon Auth, Neon Data API et Neon Realtime ne sont **pas provisionnés** sur
  `chess-simul-dev`. Le schéma POC n'a pas de policies d'autorisation utilisateurs.
- Le schéma `chess_simul` n'est **pas** la reproduction intégrale des 21 tables et
  40 migrations Supabase : social, Hydra, triggers, fonctions RPC, publication
  Realtime et règles d'accès restent à porter.
- Les migrations Supabase référencent notamment `auth.users`, `auth.uid()`
  et `supabase_realtime` ; elles ne peuvent pas être exécutées telles quelles sur Neon.
- Les Edge Functions existantes utilisent `supabase-js` et le service role.
  Remplacer seulement `SUPABASE_URL` par une URL Neon ne suffit pas.

## Suite avant toute bascule

1. Corriger `submit-move` sur Supabase (unités des horloges, mise à jour atomique,
   `moves` enregistré, gestion des résultats), et ajouter les tests concurrents.
2. Auditer les accès Supabase RLS et les fonctions `SECURITY DEFINER`, puis
   corriger dans des migrations séparées ; ne pas révoquer des droits au hasard.
3. Décider d'un fournisseur Auth et planifier la conservation des UUID, les
   comptes existants et le reset des mots de passe si nécessaire.
4. Choisir une région Neon avec Realtime, fournir une API serveur et des policies
   RLS vérifiées ; migrer le reste du schéma et les données avec contrôles de quantité.
5. Valider de bout en bout deux comptes, matchmaking, coups, annulations, timeouts,
   simultanées et Hydra, avec rollback éprouvé, avant d'envisager le cutover.

### Garde-fous

Ne versionner ni credentials Neon/PostgreSQL ni clés Supabase secrètes.
Ne pas modifier les variables d'environnement de production.
Ne pas supprimer le projet Supabase et ne pas fusionner automatiquement les PR.
